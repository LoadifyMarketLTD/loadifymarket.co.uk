# Loadify Market Romania — DSA Articles 29–30 Applicability Evidence
Date: 2026-09-28
Status: PRE-LAUNCH legal-engineering evidence

## Official legal rule
Digital Services Act Regulation (EU) 2022/2065, Section 4 applies additional duties to online platforms allowing consumers to conclude distance contracts with traders.

Article 29 excludes providers that qualify as micro or small enterprises under Commission Recommendation 2003/361/EC, unless they are designated as a very large online platform under Article 33. The exclusion also continues for 12 months after loss of micro/small status in the circumstances specified by Article 29.

Commission Recommendation 2003/361/EC defines:
- microenterprise: fewer than 10 persons and annual turnover and/or annual balance-sheet total not exceeding EUR 2 million;
- small enterprise: fewer than 50 persons and annual turnover and/or annual balance-sheet total not exceeding EUR 10 million;
- partner/linked enterprises must be considered when calculating the thresholds.

Official sources:
- https://eur-lex.europa.eu/eli/reg/2022/2065/oj
- https://eur-lex.europa.eu/eli/reco/2003/361/oj

## Public company evidence checked
Companies House, company 13171804, records:
- XDrive Logistics Ltd is active;
- one current officer is shown;
- the filing history labels the accounts made up to 27 February 2025 as "Micro company accounts";
- the filing history also labels the 2024, 2023 and 2022 filed accounts as "Micro company accounts".

Public Companies House source:
- https://find-and-update.company-information.service.gov.uk/company/13171804
- https://find-and-update.company-information.service.gov.uk/company/13171804/filing-history

## Legal-engineering conclusion
The public evidence strongly supports that XDrive Logistics Ltd is a very small undertaking. However, a UK "micro company accounts" filing label is not by itself a complete proof of the separate EU Recommendation 2003/361/EC calculation because that calculation also requires the exact staff, financial and partner/linked-enterprise position.

Therefore:
1. Do not state that Article 30 is definitely mandatory.
2. Do not state that Article 30 is definitely exempt solely from the UK filing label.
3. Treat Article 29 micro/small status as **PROVISIONALLY SUPPORTED, FINAL EVIDENCE REQUIRED**.
4. Keep the trader-traceability data model and onboarding controls as conservative marketplace safeguards even if the Article 29 exclusion is ultimately confirmed.
5. Before Romania launch, retain a signed/internal size-status evidence snapshot covering:
   - annual work units / employee headcount;
   - annual turnover;
   - annual balance-sheet total;
   - partner and linked enterprises;
   - confirmation that Loadify has not been designated a VLOP.

## Article 30 conservative control set
If Section 4 applies, Article 30 requires, where applicable to the trader, collection before the trader offers to EU consumers of:
- name;
- address;
- telephone;
- email;
- identity document/eID;
- payment-account details;
- trade-register name and registration number where registered;
- self-certification committing to offer only products/services compliant with applicable Union law.

The current Loadify source already contains business identity/contact/registration fields, Stripe payment onboarding and an explicit trader-status declaration. The identity-document workflow and the Article 30 self-certification must not be represented as complete until verified in the actual onboarding runtime.

## Closeout rule
Article 29 status is closed only when the Recommendation 2003/361/EC size calculation is evidenced for the relevant accounting period and linked/partner enterprise position. Until then Romania remains fail-closed for launch through the existing market-compliance controls.
