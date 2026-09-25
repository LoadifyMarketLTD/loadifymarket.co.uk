import type { ReactNode } from "react";

const Contact = () => (
  <ul>
    <li>Email: contact@loadifymarket.co.uk</li>
    <li>Operator: XDrive Logistics Ltd, Company No. 13171804</li>
    <li>Address: 101 Cornelian Street, Blackburn BB1 9QL, United Kingdom</li>
  </ul>
);

const LegalShell = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="legal-content">
    <h1>{title}</h1>
    <p className="text-muted-foreground"><strong>Versiune pentru piața din România — proiect pre-lansare.</strong> Ultima actualizare: 25 septembrie 2026.</p>
    {children}
  </div>
);

export const RomaniaBuyerTerms = () => (
  <LegalShell title="Termeni pentru cumpărători">
    <p>Acești termeni se aplică achizițiilor destinate pieței din România prin Loadify Market. Platforma este operată de XDrive Logistics Ltd, care tranzacționează sub marca Loadify Market.</p>
    <p><strong>Vânzătorul contractual este identificat înainte de comandă și în evidența comenzii.</strong> Pentru ofertele unui vânzător independent, contractul de vânzare este cu comerciantul indicat. Pentru produsele Loadify Supplier-Fulfilled, XDrive Logistics Ltd / Loadify Market este vânzătorul contractual, iar furnizorul aprobat poate efectua expedierea fizică.</p>
    <h2>1. Informații înainte de comandă</h2>
    <p>Înainte de plasarea unei comenzi sunt prezentate, după caz, caracteristicile esențiale ale produsului, identitatea comerciantului, prețul total și taxele obligatorii, costurile de livrare, modalitatea de plată, restricțiile de livrare, termenul estimat și informațiile privind retragerea/returul.</p>
    <h2>2. Comandă și plată</h2>
    <p>Prețurile pentru piața din România sunt afișate în RON. Plata cu cardul este procesată prin Stripe. Comanda este confirmată numai după finalizarea verificărilor de plată și eligibilitate aplicabile. Loadify nu stochează numărul complet al cardului.</p>
    <h2>3. Dreptul de retragere</h2>
    <p>Pentru contractele la distanță încheiate cu un comerciant, consumatorul beneficiază în mod obișnuit de o perioadă de 14 zile pentru retragere, fără a fi necesară justificarea, sub rezerva excepțiilor prevăzute de legislația aplicabilă. Pentru bunuri, termenul curge în mod obișnuit de la primirea acestora.</p>
    <h2>4. Produse neconforme și garanția legală</h2>
    <p>Drepturile legale privind bunurile neconforme nu sunt limitate de acești termeni. Atunci când normele UE/România privind vânzarea către consumatori se aplică, bunurile vândute de un comerciant beneficiază de garanția legală minimă aplicabilă și de remediile prevăzute de lege.</p>
    <h2>5. Marketplace</h2>
    <p>Loadify indică dacă oferta provine de la un comerciant sau, acolo unde este permis, de la o persoană care nu acționează ca profesionist. Protecțiile specifice consumatorilor pot diferi în funcție de statutul vânzătorului.</p>
    <h2>6. Retururi, rambursări și litigii</h2>
    <p>Ruta de retur și responsabilitatea pentru rambursare urmează identitatea vânzătorului contractual. Consultați Politica de retur și Politica de livrare înainte de comandă. Drepturile obligatorii ale consumatorului nu sunt excluse.</p>
    <h2>7. Contact</h2><Contact />
  </LegalShell>
);

export const RomaniaReturnsPolicy = () => (
  <LegalShell title="Politica de retur">
    <p>Această politică descrie ruta de retragere, retur și rambursare pentru comenzile destinate României. Identitatea vânzătorului contractual din comandă determină cine soluționează cererea.</p>
    <h2>1. Retragerea din contractul la distanță</h2>
    <p>Atunci când cumpără de la un comerciant și nu se aplică o excepție legală, consumatorul poate în mod obișnuit să se retragă în termen de 14 zile de la primirea bunurilor, fără a furniza un motiv.</p>
    <h2>2. Returnarea bunurilor</h2>
    <p>După notificarea retragerii, bunurile trebuie returnate în termenul legal aplicabil. Consumatorul suportă costul direct al returului atunci când acest lucru a fost comunicat înainte de cumpărare și legea permite; pentru bunurile defecte/neconforme, costurile și remediile urmează normele obligatorii aplicabile.</p>
    <h2>3. Rambursarea</h2>
    <p>Rambursarea datorată în urma unei retrageri eligibile se efectuează în termenul legal aplicabil, în principiu prin aceeași metodă de plată. Rambursarea poate fi reținută, în condițiile legii, până la primirea bunurilor sau a dovezii expedierii acestora.</p>
    <h2>4. Excepții</h2>
    <p>Dreptul de retragere poate fi exclus în cazurile prevăzute de lege, inclusiv pentru anumite bunuri personalizate, perisabile sau bunuri sigilate care nu pot fi returnate din motive de protecție a sănătății/igienă după desigilare. Excepția concretă trebuie să fie aplicabilă produsului respectiv.</p>
    <h2>5. Bunuri neconforme</h2>
    <p>O cerere privind un produs defect, deteriorat, descris incorect sau neconform este tratată separat de simpla schimbare de opinie și beneficiază de remediile legale aplicabile.</p>
    <h2>6. Cum solicitați returul</h2>
    <p>Folosiți ruta de retur din comandă sau contactați suportul. Pentru Marketplace Seller, comerciantul indicat este vânzătorul contractual; pentru Loadify Supplier-Fulfilled, Loadify este ruta de suport și vânzătorul contractual.</p>
    <h2>7. Contact</h2><Contact />
  </LegalShell>
);

export const RomaniaShippingPolicy = () => (
  <LegalShell title="Politica de livrare">
    <p>Produsele destinate României sunt oferite numai atunci când ruta de livrare, stocul și eligibilitatea pieței sunt disponibile pentru destinația cumpărătorului.</p>
    <h2>1. Cine expediază</h2>
    <p>Comenzile Marketplace Seller sunt expediate de comerciantul independent indicat. Produsele Loadify Supplier-Fulfilled sunt vândute de Loadify și pot fi expediate fizic de un furnizor sau operator logistic aprobat.</p>
    <h2>2. Cost și termen</h2>
    <p>Costul livrării și termenul estimat aplicabil sunt afișate înainte de confirmarea plății. Dacă nu a fost convenit un alt termen, se aplică obligațiile legale privind livrarea contractelor cu consumatorii, inclusiv regula UE privind livrarea în cel mult 30 de zile acolo unde aceasta este aplicabilă.</p>
    <h2>3. Adresa</h2>
    <p>Cumpărătorul trebuie să furnizeze o adresă corectă. Pentru România, fluxul de checkout validează codul poștal românesc de 6 cifre și informațiile obligatorii de livrare.</p>
    <h2>4. Urmărire și probleme de livrare</h2>
    <p>Atunci când există tracking, acesta este asociat comenzii. Pentru nelivrare, întârziere semnificativă, deteriorare sau produs greșit, folosiți ruta de suport din comandă. Drepturile obligatorii ale consumatorului rămân aplicabile.</p>
    <h2>5. Contact</h2><Contact />
  </LegalShell>
);

export const RomaniaPrivacyPolicy = () => (
  <LegalShell title="Politica de confidențialitate">
    <p>XDrive Logistics Ltd, care operează Loadify Market, prelucrează datele personale necesare furnizării marketplace-ului. Pentru persoanele din România/UE, prelucrarea este supusă Regulamentului (UE) 2016/679 (RGPD/GDPR) atunci când acesta este aplicabil.</p>
    <h2>1. Operator și contact</h2><Contact />
    <h2>2. Date prelucrate</h2>
    <p>Putem prelucra date de cont și profil, date de contact și adresă, date despre comenzi și tranzacții, mesaje și conținut marketplace, preferințe, date tehnice/diagnostice și informații privind cookie-urile și analiza, conform funcțiilor utilizate.</p>
    <h2>3. Scopuri și temeiuri</h2>
    <p>Datele sunt utilizate pentru executarea contractului și furnizarea serviciilor, securitate și prevenirea fraudei, respectarea obligațiilor legale, interese legitime permise și, acolo unde este necesar, pe baza consimțământului.</p>
    <h2>4. Destinatari și furnizori</h2>
    <p>Datele pot fi partajate în măsura necesară cu vânzătorul/partenerul de fulfilment implicat în comandă și cu furnizori precum Stripe, Supabase, servicii de hosting, e-mail, notificări și analiză. Loadify nu vinde date personale.</p>
    <h2>5. Drepturile persoanei vizate</h2>
    <p>În condițiile RGPD, puteți avea drepturi de informare, acces, rectificare, ștergere, restricționare, portabilitate și opoziție, precum și dreptul de a retrage consimțământul atunci când prelucrarea se bazează pe consimțământ.</p>
    <h2>6. Păstrare și securitate</h2>
    <p>Datele sunt păstrate numai atât timp cât este necesar pentru scopurile declarate, obligații legale, contabilitate, prevenirea fraudei și soluționarea litigiilor. Folosim măsuri tehnice și organizatorice adecvate riscului.</p>
    <h2>7. Transferuri internaționale</h2>
    <p>Atunci când datele sunt transferate în afara SEE/UK, sunt utilizate mecanismele de protecție aplicabile, inclusiv decizii de adecvare sau clauze contractuale standard, după caz.</p>
    <h2>8. Plângeri</h2>
    <p>Persoanele vizate din România pot depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), fără a afecta alte căi de atac disponibile.</p>
  </LegalShell>
);
