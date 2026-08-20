-- 618_supplier_foundation_guards.sql
-- Branch Guard follow-up for Phase D.
-- Strengthens SLA supersession and binds active adapters to current Phase C
-- provider capability evidence. Supplier Commerce remains disabled by default.

ALTER TABLE private.supplier_adapter_registrations
  ADD COLUMN IF NOT EXISTS territory text NOT NULL DEFAULT 'GB';

CREATE OR REPLACE FUNCTION private.guard_supplier_sla_supersession_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF NEW.status = 'superseded'
     AND NEW.effective_to IS NOT NULL
     AND NEW.effective_to <= NEW.effective_from THEN
    NEW.effective_to := NEW.effective_from + interval '1 microsecond';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_supplier_sla_supersession_v1
  ON private.supplier_sla_versions;
CREATE TRIGGER trg_guard_supplier_sla_supersession_v1
BEFORE UPDATE ON private.supplier_sla_versions
FOR EACH ROW
EXECUTE FUNCTION private.guard_supplier_sla_supersession_v1();

CREATE OR REPLACE FUNCTION private.guard_supplier_adapter_evidence_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_capability text;
BEGIN
  NEW.provider_key := lower(BTRIM(NEW.provider_key));
  NEW.adapter_key := lower(BTRIM(NEW.adapter_key));
  NEW.territory := upper(BTRIM(NEW.territory));

  IF cardinality(NEW.capabilities) <> (
    SELECT count(DISTINCT capability)
      FROM unnest(NEW.capabilities) AS capability
  ) THEN
    RAISE EXCEPTION 'adapter capabilities must be unique' USING ERRCODE = '23514';
  END IF;

  IF NEW.status = 'active' THEN
    FOREACH v_capability IN ARRAY NEW.capabilities
    LOOP
      IF NOT EXISTS (
        SELECT 1
          FROM private.supplier_commerce_provider_capabilities pc
         WHERE pc.provider_key = NEW.provider_key
           AND pc.territory = NEW.territory
           AND pc.capability = v_capability
           AND pc.status = 'verified'
           AND pc.verified_at IS NOT NULL
           AND pc.reverify_due_at > now()
           AND jsonb_array_length(pc.official_source_refs) > 0
      ) THEN
        RAISE EXCEPTION 'current verified provider capability evidence is required for active adapter: %', v_capability
          USING ERRCODE = '23514';
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_supplier_adapter_evidence_v1
  ON private.supplier_adapter_registrations;
CREATE TRIGGER trg_guard_supplier_adapter_evidence_v1
BEFORE INSERT OR UPDATE ON private.supplier_adapter_registrations
FOR EACH ROW
EXECUTE FUNCTION private.guard_supplier_adapter_evidence_v1();

REVOKE ALL ON FUNCTION private.guard_supplier_sla_supersession_v1() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.guard_supplier_adapter_evidence_v1() FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION private.guard_supplier_adapter_evidence_v1() IS
  'Phase D fail-closed adapter activation guard. Every active adapter capability requires current, official-source-backed Phase C provider evidence for the same provider and territory.';
