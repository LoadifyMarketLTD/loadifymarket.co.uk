import type { ReactNode } from "react";

const Contact = () => (
  <ul>
    <li>Operator: XDrive Logistics Ltd, Company No. 13171804</li>
    <li>VAT: GB375949535</li>
    <li>Address: 101 Cornelian Street, Blackburn BB1 9QL, United Kingdom</li>
    <li>Email: contact@loadifymarket.co.uk</li>
    <li>Telefon: +44 7423 272138</li>
  </ul>
);

const LegalShell = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="legal-content">
    <h1>{title}</h1>
    <p className="text-muted-foreground">
      <strong>Versiune pentru piața din România — proiect pre-lansare.</strong> Ultima actualizare: 28 septembrie 2026.
    </p>
    {children}
  </div>
);

export const RomaniaBuyerTerms = () => (
  <LegalShell title="Termeni pentru cumpărători">
    <p>Acești termeni se aplică achizițiilor destinate pieței din România prin Loadify Market. Platforma este operată de XDrive Logistics Ltd, care tranzacționează sub marca Loadify Market.</p>
    <p><strong>Vânzătorul contractual este partea terță identificată în ofertă și în comandă.</strong> Aceasta poate fi un profesionist sau, acolo unde este permis și indicat clar, o persoană care nu acționează ca profesionist. Loadify Market operează infrastructura marketplace și poate facilita căutarea, comanda, plata, tracking-ul și suportul, dar nu deține, nu pre-cumpără și nu devine proprietarul bunurilor oferite de terți. Această delimitare nu exclude obligațiile proprii ale Loadify Market în calitate de furnizor al pieței online.</p>

    <h2>1. Informații înainte de comandă</h2>
    <p>Înainte ca o comandă să producă efecte obligatorii sunt prezentate, după caz, caracteristicile esențiale ale produsului, identitatea și statutul vânzătorului, prețul total, taxele obligatorii, costurile de livrare, modalitățile de plată, restricțiile și termenul de livrare, informațiile privind retragerea, garanția legală de conformitate și modul în care obligațiile contractuale sunt împărțite între vânzător și Loadify Market.</p>
    <p>Dacă partea terță nu este profesionist, acest lucru trebuie indicat clar înainte de încheierea contractului, împreună cu faptul că drepturile specifice consumatorilor aplicabile contractelor încheiate cu profesioniști nu se aplică în aceeași formă contractului respectiv.</p>

    <h2>2. Ierarhia ofertelor și căutarea</h2>
    <p>Loadify Market pune la dispoziție informații privind principalii parametri de ordonare a ofertelor și importanța lor relativă. În implementarea curentă, utilizatorul poate filtra rezultatele după criterii precum categorie, preț, condiție și tipul listării. Sortările disponibile includ preț crescător, preț descrescător, cele mai noi și rating. În lipsa unei sortări selectate, rezultatele eligibile sunt ordonate în principal după data publicării, cu cele mai noi mai întâi.</p>

    <h2>3. Comandă, contract și plată</h2>
    <p>Prețurile pentru piața din România sunt afișate în RON. Plata cu cardul este procesată prin Stripe. Loadify Market nu stochează numărul complet al cardului. Înainte de plasarea unei comenzi care implică plată, interfața trebuie să indice clar obligația de plată, iar confirmarea comenzii și informațiile contractuale relevante sunt transmise pe un suport durabil, conform fluxului aplicabil.</p>

    <h2>4. Dreptul de retragere</h2>
    <p>Pentru contractele la distanță încheiate cu un profesionist, consumatorul beneficiază, de regulă, de 14 zile pentru retragere fără justificare, sub rezerva excepțiilor prevăzute de lege. Pentru bunuri, perioada se calculează în funcție de data intrării în posesia fizică și, după caz, de modul în care bunurile, loturile sau piesele sunt livrate.</p>
    <p>Pentru contractele eligibile încheiate prin interfață online este disponibilă funcția <a href="/buyer/withdrawal">„Retrageți-vă din contract aici”</a>, vizibilă și accesibilă pe durata perioadei de retragere. Consumatorul poate furniza sau confirma datele necesare identificării sale și a contractului și finalizează declarația prin acțiunea „Confirmați retragerea”. După transmitere, se trimite fără întârziere nejustificată o confirmare pe suport durabil care include conținutul declarației, data și ora transmiterii.</p>

    <h2>5. Produse neconforme și garanția legală</h2>
    <p>Drepturile legale privind bunurile neconforme nu sunt limitate de acești termeni. Atunci când OUG nr. 140/2021 se aplică, vânzătorul răspunde pentru neconformitatea care există la livrare și devine aparentă în perioada legală aplicabilă. Consumatorul poate avea dreptul la reparare sau înlocuire fără costuri și, în condițiile legii, la reducerea proporțională a prețului sau la încetarea contractului.</p>

    <h2>6. Responsabilitățile marketplace-ului și ale vânzătorului</h2>
    <p>Vânzătorul contractual răspunde pentru obligațiile care îi revin din contractul de vânzare, inclusiv livrarea, conformitatea și rambursările datorate de acesta. Loadify Market răspunde separat pentru obligațiile proprii care îi revin ca furnizor al pieței online și nu exclude sau limitează drepturile obligatorii conferite consumatorului de lege.</p>

    <h2>7. Trasabilitatea vânzătorilor</h2>
    <p>Pentru vânzătorii profesioniști care oferă produse consumatorilor din Uniunea Europeană, Loadify Market colectează și verifică, înainte de activarea vânzării acolo unde legea o impune, informațiile de identificare și trasabilitate relevante, inclusiv date de contact, identificare, cont de plată și informații de registru, după caz. Informațiile care trebuie afișate consumatorului sunt prezentate în interfață conform obligațiilor legale aplicabile.</p>

    <h2>8. Retururi, rambursări și reclamații</h2>
    <p>Retragerea fără motiv este distinctă de reclamațiile privind bunurile neconforme. Ruta de retur și responsabilitatea pentru rambursare depind de identitatea vânzătorului contractual și de motivul cererii. Consultați Politica de retur și Politica de livrare înainte de comandă.</p>

    <h2>9. Datele operatorului și contact</h2>
    <Contact />
  </LegalShell>
);

export const RomaniaReturnsPolicy = () => (
  <LegalShell title="Politica de retur">
    <p>Această politică descrie retragerea, returul și rambursarea pentru comenzile destinate României. Identitatea vânzătorului contractual din comandă determină cine are obligația principală de a soluționa cererea, fără a exclude obligațiile proprii ale Loadify Market ca furnizor al pieței online.</p>

    <h2>1. Retragerea din contractul la distanță</h2>
    <p>Atunci când cumpără de la un profesionist și nu se aplică o excepție legală, consumatorul se poate retrage, de regulă, în termen de 14 zile fără a furniza un motiv. Pentru bunuri, calculul perioadei depinde de modalitatea de livrare, inclusiv situațiile în care o comandă conține mai multe bunuri livrate separat sau un bun livrat în mai multe loturi ori piese.</p>

    <h2>2. Funcția online de retragere</h2>
    <p>Pentru contractele eligibile încheiate prin interfață online, funcția <a href="/buyer/withdrawal">„Retrageți-vă din contract aici”</a> este disponibilă pe durata perioadei de retragere. Consumatorul furnizează sau confirmă datele necesare identificării sale și a contractului, apoi utilizează acțiunea „Confirmați retragerea”. Confirmarea de primire este transmisă fără întârziere nejustificată pe un suport durabil și conține conținutul declarației, data și ora transmiterii.</p>

    <h2>3. Returnarea bunurilor</h2>
    <p>Cu excepția cazului în care profesionistul s-a oferit să recupereze bunurile, consumatorul trebuie să le returneze sau să le predea fără întârziere nejustificată și în cel mult 14 zile de la comunicarea retragerii. Termenul este respectat dacă bunurile sunt expediate înainte de expirarea celor 14 zile.</p>
    <p>Consumatorul suportă costurile directe ale returului numai atunci când acest lucru a fost comunicat în mod corespunzător înainte de cumpărare și legea permite. Pentru bunurile care, prin natura lor, nu pot fi returnate în mod normal prin poștă, costul sau o estimare rezonabilă a costului trebuie comunicată atunci când legea cere acest lucru.</p>

    <h2>4. Rambursarea</h2>
    <p>Pentru o retragere eligibilă, profesionistul rambursează sumele datorate, inclusiv costul livrării standard, fără întârziere nejustificată și, în orice caz, în cel mult 14 zile de la informarea privind retragerea. Costurile suplimentare rezultate din alegerea expresă a unei metode de livrare mai scumpe decât livrarea standard oferită nu trebuie rambursate.</p>
    <p>Rambursarea se face, în principiu, prin aceeași metodă de plată, fără costuri pentru consumator, dacă acesta nu a acceptat altă metodă. Pentru vânzarea de bunuri, rambursarea poate fi amânată, în condițiile legii, până la primirea bunurilor sau până la prezentarea dovezii expedierii, luându-se în considerare data cea mai apropiată.</p>

    <h2>5. Diminuarea valorii</h2>
    <p>Consumatorul poate răspunde numai pentru diminuarea valorii bunului rezultată din manipulări care depășesc ceea ce este necesar pentru stabilirea naturii, caracteristicilor și funcționării bunului, în condițiile prevăzute de lege.</p>

    <h2>6. Excepții</h2>
    <p>Dreptul de retragere nu se aplică în toate situațiile. Printre excepțiile legale pot intra, dacă sunt îndeplinite condițiile concrete, bunurile realizate după specificațiile consumatorului sau clar personalizate, bunurile susceptibile să se deterioreze sau să expire rapid și anumite bunuri sigilate care, după desigilare, nu pot fi returnate din motive de protecție a sănătății sau de igienă. Excepția trebuie analizată pentru produsul și situația concretă.</p>

    <h2>7. Bunuri neconforme</h2>
    <p>Un produs defect, deteriorat, descris incorect sau neconform este tratat separat de retragerea fără motiv. Pentru vânzările cărora li se aplică OUG nr. 140/2021, consumatorul poate avea dreptul la reparare sau înlocuire fără costuri și, în condițiile legii, la reducerea prețului sau încetarea contractului.</p>

    <h2>8. Cum solicitați returul</h2>
    <p>Pentru retragerea legală folosiți funcția online indicată mai sus. Pentru returul fizic al bunului, pentru o reclamație de neconformitate sau pentru o problemă de livrare, utilizați ruta asociată comenzii ori contactați suportul. Loadify poate facilita transmiterea cererii către vânzătorul contractual, fără a transforma Loadify în vânzătorul bunului.</p>

    <h2>9. Contact</h2>
    <Contact />
  </LegalShell>
);

export const RomaniaShippingPolicy = () => (
  <LegalShell title="Politica de livrare">
    <p>Produsele destinate României sunt oferite numai atunci când ruta de livrare, stocul și eligibilitatea pieței sunt disponibile pentru destinația cumpărătorului.</p>

    <h2>1. Cine expediază</h2>
    <p>Comenzile Marketplace Seller sunt expediate de vânzătorul independent indicat în comandă sau de operatorul logistic utilizat de acesta. Produsele provenite prin rețeaua de furnizori aprobați sunt vândute de furnizorul independent identificat pentru comandă și sunt expediate de acesta sau de operatorul logistic autorizat de acesta.</p>

    <h2>2. Cost, restricții și termen</h2>
    <p>Costul livrării, restricțiile aplicabile și termenul estimat sunt afișate înainte ca plata să fie confirmată. Dacă nu a fost convenit un alt termen, profesionistul trebuie să livreze fără întârziere nejustificată și, în orice caz, în cel mult 30 de zile de la încheierea contractului.</p>

    <h2>3. Întârzierea sau nelivrarea</h2>
    <p>Dacă bunul nu este livrat la termenul convenit sau în termenul legal aplicabil, consumatorul poate solicita livrarea într-un termen suplimentar adecvat circumstanțelor. Dacă nici acel termen nu este respectat, consumatorul poate avea dreptul la încetarea contractului. În situațiile în care profesionistul refuză livrarea sau termenul convenit este esențial, legea poate permite încetarea fără acordarea unui termen suplimentar.</p>

    <h2>4. Transferarea riscului</h2>
    <p>În mod normal, riscul de pierdere sau deteriorare se transferă consumatorului atunci când acesta sau o persoană terță desemnată de el, alta decât transportatorul, intră în posesia fizică a bunurilor. Dacă transportatorul a fost ales și însărcinat direct de consumator, iar acea opțiune nu a fost oferită de profesionist, se aplică regula legală specială privind transferul riscului la predarea către transportator.</p>

    <h2>5. Adresa și datele de livrare</h2>
    <p>Cumpărătorul trebuie să furnizeze date de livrare corecte și complete. Pentru România, fluxul de checkout validează codul poștal românesc de 6 cifre și informațiile obligatorii de livrare.</p>

    <h2>6. Urmărire și probleme de livrare</h2>
    <p>Atunci când există tracking, acesta este asociat comenzii. Pentru nelivrare, întârziere semnificativă, deteriorare sau produs greșit, utilizați ruta de suport din comandă. O problemă de transport nu înlătură drepturile obligatorii privind livrarea, conformitatea sau retragerea.</p>

    <h2>7. Contact</h2>
    <Contact />
  </LegalShell>
);

export const RomaniaPrivacyPolicy = () => (
  <LegalShell title="Politica de confidențialitate">
    <p>XDrive Logistics Ltd, care operează Loadify Market, prelucrează datele personale necesare furnizării marketplace-ului. Pentru persoanele aflate în România/Uniunea Europeană, Regulamentul (UE) 2016/679 (GDPR) se aplică atunci când activitățile de prelucrare intră în domeniul său de aplicare teritorial.</p>

    <h2>1. Operator și contact</h2>
    <Contact />
    <p>XDrive Logistics Ltd este operatorul datelor pentru prelucrările pentru care stabilește scopurile și mijloacele în legătură cu funcționarea Loadify Market. Vânzătorii, furnizorii de fulfilment sau alți parteneri pot acționa, în funcție de activitatea concretă, ca operatori independenți, operatori asociați sau persoane împuternicite; rolul aplicabil trebuie stabilit prin fluxul și acordurile relevante.</p>

    <h2>2. Reprezentant în Uniunea Europeană</h2>
    <p>XDrive Logistics Ltd este stabilită în Regatul Unit. Pentru lansarea operațională destinată persoanelor din România/UE, obligația de desemnare în scris a unui reprezentant în Uniune conform art. 27 GDPR trebuie evaluată și, atunci când se aplică, reprezentantul trebuie desemnat și datele sale de contact publicate. <strong>Până la închiderea acestei cerințe, versiunea România rămâne în regim pre-lansare.</strong></p>

    <h2>3. Categorii de date</h2>
    <p>În funcție de funcțiile utilizate, putem prelucra date de cont și profil, nume și date de contact, adrese de facturare și livrare, informații despre comenzi și tranzacții, identificatori de plată furnizați de procesatorul de plăți, mesaje și conținut marketplace, date privind retururile și suportul, preferințe, date tehnice și de securitate, identificatori ai dispozitivului, loguri și informații privind cookie-urile și analiza.</p>

    <h2>4. Scopuri și temeiuri juridice</h2>
    <ul>
      <li><strong>Executarea contractului sau măsuri precontractuale:</strong> creare și administrare cont, procesarea comenzilor, livrare, retururi, suport și comunicări necesare tranzacției.</li>
      <li><strong>Obligații legale:</strong> evidențe contabile și fiscale, răspunsuri la cereri legale, protecția consumatorilor, trasabilitatea vânzătorilor și alte obligații aplicabile marketplace-ului.</li>
      <li><strong>Interese legitime:</strong> securitatea platformei, prevenirea fraudei și abuzului, protejarea drepturilor Loadify și ale utilizatorilor, depanare și îmbunătățirea fiabilității serviciului, după evaluarea caracterului necesar și a impactului asupra persoanei vizate.</li>
      <li><strong>Consimțământ:</strong> acolo unde legea îl cere, de exemplu pentru anumite cookie-uri neesențiale sau comunicări de marketing. Consimțământul poate fi retras fără a afecta legalitatea prelucrării anterioare retragerii.</li>
    </ul>

    <h2>5. Destinatari și furnizori</h2>
    <p>Datele pot fi comunicate, strict în măsura necesară scopului, vânzătorului sau partenerului de fulfilment implicat în comandă și furnizorilor tehnologici utilizați pentru operarea platformei. Furnizorii identificați în implementarea curentă includ:</p>
    <ul>
      <li><strong>Stripe:</strong> procesarea plăților și infrastructura Stripe Connect pentru selleri;</li>
      <li><strong>Supabase:</strong> autentificare, bază de date, stocare și servicii backend asociate;</li>
      <li><strong>Netlify:</strong> hosting, livrarea aplicației și funcții server-side;</li>
      <li><strong>Resend:</strong> transmiterea e-mailurilor tranzacționale și operaționale;</li>
      <li><strong>Firebase Cloud Messaging:</strong> livrarea notificărilor push pe dispozitivele compatibile, atunci când această funcție este activată;</li>
      <li><strong>Google Analytics:</strong> analiză de utilizare numai atunci când serviciul este configurat și consimțământul necesar a fost acordat.</li>
    </ul>
    <p>Furnizorii nu dobândesc dreptul de a utiliza datele pentru scopuri incompatibile cu rolul lor contractual. Loadify nu vinde date personale. Lista operațională a furnizorilor este revizuită înainte de lansarea România și la modificarea materială a infrastructurii.</p>

    <h2>6. Date obținute indirect</h2>
    <p>Dacă primim date personale despre o persoană din altă sursă decât direct de la aceasta, de exemplu de la un vânzător, furnizor de fulfilment sau alt partener implicat într-o comandă, furnizăm informațiile cerute de art. 14 GDPR atunci când obligația se aplică, inclusiv categoriile de date și sursa acestora.</p>

    <h2>7. Păstrarea datelor și ștergerea contului</h2>
    <p>Păstrăm datele numai atât timp cât este necesar pentru furnizarea serviciului, îndeplinirea obligațiilor legale, soluționarea disputelor, prevenirea fraudei și menținerea evidențelor comerciale adecvate.</p>
    <p>La finalizarea unei cereri de ștergere a contului, identitatea de autentificare este eliminată, iar datele de profil, contact și storefront sunt eliminate sau anonimizate. Date precum wishlist, căutări salvate, notificări, tokenuri push, conversații fără legătură cu o tranzacție și alte activități care nu trebuie păstrate sunt eliminate, iar listările sellerului sunt dezactivate și imaginile de produs asociate sunt șterse din stocarea controlată de Loadify.</p>
    <p>Anumite evidențe legate de comenzi, plăți, livrare, retururi/dispute, listări sau comunicări legate de tranzacții, moderare, prevenirea fraudei și audit pot fi păstrate atunci când acest lucru este necesar pentru contabilitate, securitate, soluționarea disputelor, reconcilierea plăților sau alte obligații legale și de reglementare. Atunci când este necesară păstrarea, aceste evidențe pot fi reținute până la 6 ani și sunt asociate, pe cât posibil, numai unui identificator de cont anonimizat atunci când relația din baza de date trebuie păstrată.</p>
    <p>Perioada efectivă poate fi mai scurtă atunci când scopul dispare și nu există o obligație sau un interes legitim care să justifice păstrarea.</p>

    <h2>8. Transferuri internaționale</h2>
    <p>În funcție de furnizorul și serviciul concret, datele pot fi prelucrate în afara Spațiului Economic European. Înainte ca versiunea România să fie activată comercial, fiecare flux relevant trebuie mapat la locația de prelucrare și la mecanismul juridic aplicabil. Atunci când GDPR impune garanții pentru un transfer internațional, sunt utilizate mecanismele prevăzute de capitolul V GDPR, precum o decizie de adecvare, clauze contractuale standard sau alt mecanism legal aplicabil. Persoanele vizate pot solicita informații privind garanțiile relevante pentru transferurile care le privesc.</p>

    <h2>9. Drepturile persoanei vizate</h2>
    <p>În condițiile GDPR, persoana vizată poate avea dreptul la informare și acces, rectificare, ștergere, restricționare, portabilitate, opoziție și retragerea consimțământului atunci când temeiul este consimțământul. Drepturile nu sunt absolute și pot fi limitate atunci când GDPR sau altă lege aplicabilă permite acest lucru.</p>

    <h2>10. Decizii automatizate și profilare</h2>
    <p>Dacă Loadify utilizează o decizie bazată exclusiv pe prelucrare automatizată care produce efecte juridice sau afectează în mod similar și semnificativ o persoană, informațiile și garanțiile cerute de GDPR trebuie furnizate și aplicate. Simpla sortare a produselor sau filtrele de căutare nu sunt prezentate ca o astfel de decizie individuală cu efect juridic.</p>

    <h2>11. Securitate</h2>
    <p>Aplicăm măsuri tehnice și organizatorice adecvate riscului pentru a proteja confidențialitatea, integritatea și disponibilitatea datelor. Incidentele sunt gestionate conform obligațiilor legale aplicabile.</p>

    <h2>12. Cookie-uri și tehnologii similare</h2>
    <p>Cookie-urile strict necesare pot fi utilizate pentru funcționarea și securitatea serviciului. Cookie-urile sau tehnologiile neesențiale sunt utilizate numai în condițiile în care există temeiul și opțiunile de consimțământ cerute de lege. Detaliile operaționale sunt descrise în Politica de cookie-uri.</p>

    <h2>13. Plângeri</h2>
    <p>Persoanele vizate din România pot depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), fără a afecta alte căi administrative sau judiciare disponibile.</p>
  </LegalShell>
);
