// Shared SEO/AEO rules for the Premier Visibility app. Runs in the browser and on the server.
// Keep in sync with seo/brief.src.html when rules change.
const SITE = "https://premierfamilybusiness.com";
const ORG = {name:"Premier Family Business Consulting, Inc.", phone:"+63 32 252 3504", email:"info@premierfamilybusiness.com",
  street:"35F Cebu Exchange Tower, Salinas Drive", city:"Cebu City", country:"PH",
  sameAs:["https://www.linkedin.com/company/premier-family-business-consulting-inc","https://www.facebook.com/PremierFamilyBusiness","https://www.instagram.com/premier.fbc"]};
const MARKETS = ["Global (English)","Philippines","Southeast Asia","Greater China / Chinese diaspora","Middle East","North America","Europe / UK","Australia / NZ"];
const SCHEMAS = ["Organization","ProfessionalService","WebPage","BreadcrumbList","Service","FAQPage","HowTo","Article","Person","Event","Book","PodcastSeries","ContactPage","CollectionPage"];
const TECH = [
  ["index","Indexable: no noindex, allowed in robots.txt, in the XML sitemap"],
  ["canon","Self-referencing canonical tag"],
  ["redirect","Old URL(s) from the previous site 301-redirect here"],
  ["mobile","Checked on a phone: no horizontal scroll, tap targets fine"],
  ["psi","PageSpeed Insights mobile 70+ (LCP < 2.5 s, CLS < 0.1, INP < 200 ms)"],
  ["img","Images WebP, sized, lazy-loaded below the fold"],
  ["rich","JSON-LD passes the Rich Results Test"],
  ["crumbs","Breadcrumbs visible and marked up"],
  ["gsc","Indexing requested in Search Console and submitted to Bing (IndexNow)"],
  ["ai","AI crawlers allowed (OAI-SearchBot, PerplexityBot, Google-Extended, Bingbot)"]
];
const GLOBAL_ENT = ["Premier Family Business Consulting","Jonathan \"Jon\" A. Ramos","Family Firm Institute (FFI)","Cebu City, Philippines"];
const TARGET_WORDS = {home:600,service:1200,about:600,profile:350,hub:300,article:1200,event:400,faq:800,contact:300,legal:0};
const TYPE_LABEL = {home:"Home",service:"Service pillar",about:"About / team",profile:"Person profile",hub:"Hub / listing",article:"Article (cluster)",event:"Event",faq:"FAQ",contact:"Contact / booking",legal:"Legal"};

/* Recommended keywords per page. Volumes are not included on purpose: verify each primary before locking it. */
const PAGES = [
 {id:"home",name:"Home",url:"/",type:"home",intent:"Commercial investigation",schema:["Organization","ProfessionalService","WebPage"],
  note:"Ranks for the category and routes visitors to Succession. Keep it short and let the pillars carry depth.",
  p:"family business consulting",
  s:["family business consultants","family business advisory firm","family enterprise consulting","family business consulting Philippines","family business advisors Southeast Asia","succession planning for family businesses","family governance consulting"],
  q:["What does a family business consultant do?","When should a family business hire a consultant?","How is family business consulting different from management consulting?","How much does family business consulting cost?"],
  e:[...GLOBAL_ENT,"FBN Asia","University of Asia and the Pacific"]},
 {id:"what-we-do",name:"What We Do",url:"/what-we-do/",type:"hub",intent:"Commercial investigation",schema:["WebPage","BreadcrumbList","CollectionPage"],
  note:"Hub for the four practices. Each card links down with a keyword-rich anchor.",
  p:"family business consulting services",
  s:["family business succession planning","family governance","professionalizing a family business","next generation leadership","family business advisory services"],
  q:["What services do family business consultants offer?","Which family business service do I need first?"],
  e:[...GLOBAL_ENT]},
 {id:"succession",name:"Succession & Continuity",url:"/what-we-do/succession-planning/",type:"service",intent:"Commercial investigation",schema:["Service","FAQPage","BreadcrumbList","WebPage"],
  note:"Flagship pillar. Every other page links here. The highest-value brief on the site.",
  p:"family business succession planning",
  s:["succession plan for family business","family business transition planning","ownership succession","leadership succession in family business","succession planning consultant","family business succession in Asia","business succession planning Philippines","estate and succession planning"],
  q:["How do you create a succession plan for a family business?","When should a family business start succession planning?","How long does family business succession planning take?","How much does succession planning cost?","What percentage of family businesses survive to the third generation?","What happens if a family business has no succession plan?"],
  e:[...GLOBAL_ENT,"Certified Family Business Advisor (CFBA)","Certified Family Wealth Advisor (CFWA)"]},
 {id:"governance",name:"Family Governance",url:"/what-we-do/family-governance/",type:"service",intent:"Commercial investigation",schema:["Service","FAQPage","BreadcrumbList","WebPage"],
  note:"Owns the family constitution and family council terms.",
  p:"family governance",
  s:["family constitution","family charter","family council","family business governance structure","family assembly","family employment policy","board of directors for family business","family governance consultant"],
  q:["What is a family constitution?","What should a family constitution include?","What is the difference between a family council and a board of directors?","How do you resolve conflict in a family business?","How often should a family council meet?"],
  e:[...GLOBAL_ENT]},
 {id:"professionalizing",name:"Professionalizing the Business",url:"/what-we-do/professionalizing-family-business/",type:"service",intent:"Commercial investigation",schema:["Service","FAQPage","BreadcrumbList","WebPage"],
  note:"Replaces the old 'Organizational Systems Effectiveness' and 'Key Process Management' pages. Redirect both here.",
  p:"professionalizing a family business",
  s:["family business management systems","organizational structure of a family business","hiring non-family executives","family business KPIs","separating family and business finances","independent directors family business","Premier IDEA"],
  q:["What does it mean to professionalize a family business?","How do you bring non-family managers into a family business?","When should a family business create an independent board?"],
  e:[...GLOBAL_ENT]},
 {id:"nextgen",name:"Next-Gen Leadership",url:"/what-we-do/next-generation-leadership/",type:"service",intent:"Commercial investigation",schema:["Service","FAQPage","BreadcrumbList","WebPage"],
  note:"Replaces 'Premier IDEA' as a service name. Speaks to both parents and successors.",
  p:"next generation leadership in family business",
  s:["next-gen leadership program","successor development","preparing heirs to lead the family business","family business leadership development","Premier Leadership Institute","next generation family business Philippines"],
  q:["How do you prepare the next generation to lead a family business?","Should the next generation work outside the family business first?","At what age should children join the family business?"],
  e:[...GLOBAL_ENT,"Premier Leadership Institute"]},
 {id:"approach",name:"Our Approach",url:"/our-approach/",type:"service",intent:"Commercial investigation",schema:["HowTo","WebPage","BreadcrumbList","FAQPage"],
  note:"Explains the method step by step. Mark it up as HowTo using the outline's H2s.",
  p:"family business consulting process",
  s:["family business review","family business assessment","how family business consulting works","family business engagement timeline","family business consulting fees"],
  q:["What happens in a family business review?","What are the steps in a family business consulting engagement?","How long does a family business consulting engagement take?"],
  e:[...GLOBAL_ENT]},
 {id:"who-we-are",name:"Who We Are",url:"/who-we-are/",type:"about",intent:"Navigational",schema:["Organization","WebPage","BreadcrumbList"],
  note:"Founding story, proof, partners. Carries most of the E-E-A-T weight.",
  p:"family business consulting firm",
  s:["Premier Family Business Consulting","family business consulting firm Philippines","family business advisors in Asia","Family Firm Institute Fellow","family business consultants Cebu"],
  q:["Who is Premier Family Business Consulting?","Who founded Premier Family Business Consulting?"],
  e:[...GLOBAL_ENT,"FBN Asia","University of Asia and the Pacific"]},
 {id:"team",name:"Our Team",url:"/who-we-are/our-team/",type:"about",intent:"Navigational",schema:["WebPage","BreadcrumbList","Person"],
  note:"Every consultant gets a name, credential, photo with alt text and a link to their profile.",
  p:"family business consultants",
  s:["certified family business advisors","family wealth advisors","family business consultant Philippines","FFI certified consultants"],
  q:["Who are Premier's family business consultants?","What credentials should a family business consultant have?"],
  e:[...GLOBAL_ENT,"Certified Family Business Advisor (CFBA)","Certified Family Wealth Advisor (CFWA)"]},
 {id:"profile-jon",name:"Profile · Jon Ramos",url:"/who-we-are/our-team/jon-ramos/",type:"profile",intent:"Navigational",schema:["Person","WebPage","BreadcrumbList"],
  note:"Template for every leader profile. Person schema with sameAs to LinkedIn and FFI.",
  p:"Jon Ramos family business",
  s:["Jonathan Ramos family business consultant","Jon Ramos FFI Fellow","Legacy in Action author","family business speaker Philippines"],
  q:["Who is Jon Ramos?","What is Jon Ramos known for?"],
  e:["Jonathan \"Jon\" A. Ramos","Family Firm Institute (FFI)","FFI Board of Directors","Legacy in Action","Premier Family Business Consulting"]},
 {id:"legacy",name:"Legacy in Action",url:"/legacy-in-action/",type:"hub",intent:"Informational",schema:["Book","PodcastSeries","WebPage","BreadcrumbList"],
  note:"Book and podcast. Give each episode its own page with a full transcript: transcripts are what AI engines quote.",
  p:"Legacy in Action",
  s:["Legacy in Action book","Jon Ramos book","family business book","family business podcast","family legacy podcast Asia","3Ms of family business"],
  q:["What is Legacy in Action about?","Who should read Legacy in Action?","Where can I listen to the Legacy in Action podcast?"],
  e:["Legacy in Action","Jonathan \"Jon\" A. Ramos","Premier Family Business Consulting"]},
 {id:"resources",name:"Resources",url:"/resources/",type:"hub",intent:"Informational",schema:["CollectionPage","BreadcrumbList"],
  note:"Article hub. Group articles by pillar so internal links flow to the service pages.",
  p:"family business resources",
  s:["family business articles","family business insights","family business succession articles","family governance guides"],
  q:["Where can I learn about running a family business?"],
  e:[...GLOBAL_ENT]},
 {id:"article",name:"Article template",url:"/resources/how-to-create-a-family-business-succession-plan/",type:"article",intent:"Informational",schema:["Article","FAQPage","BreadcrumbList","Person"],
  note:"Duplicate this brief for every article. Target one long-tail question and link up to its pillar.",
  p:"how to create a succession plan for a family business",
  s:["succession plan template","succession planning steps","family business successor","succession timeline"],
  q:["What are the steps in succession planning?","Who should be involved in a family business succession plan?","What should a succession plan include?"],
  e:[...GLOBAL_ENT]},
 {id:"events",name:"Events",url:"/events/",type:"event",intent:"Informational",schema:["Event","BreadcrumbList","WebPage"],
  note:"One page per event with Event schema, then a recap article afterwards.",
  p:"family business events",
  s:["family business conference Asia","family enterprise roadshow","family business forum Philippines","family business webinar"],
  q:["Are there family business conferences in the Philippines?"],
  e:[...GLOBAL_ENT,"Family Enterprise Roadshow"]},
 {id:"faqs",name:"FAQs",url:"/faqs/",type:"faq",intent:"Informational",schema:["FAQPage","BreadcrumbList","WebPage"],
  note:"Keep answers here short and link each one to the page that answers it in full.",
  p:"family business consulting FAQ",
  s:["family business questions","succession planning FAQ","family governance FAQ"],
  q:["How long does a family business engagement take?","Do you work with family businesses outside the Philippines?","Is everything we discuss confidential?","How much does it cost?"],
  e:[...GLOBAL_ENT]},
 {id:"contact",name:"Book a Family Business Review",url:"/contact/",type:"contact",intent:"Transactional",schema:["ContactPage","ProfessionalService","BreadcrumbList"],
  note:"Local on purpose. Name, address and phone must match Google Business Profile exactly.",
  p:"book a family business review",
  s:["family business consultant Cebu","family business consultant Manila","contact family business consultant","family business consultation"],
  q:["How do I book a consultation?","How quickly will Premier respond?"],
  e:[...GLOBAL_ENT,"Cebu Exchange Tower"]},
 {id:"privacy",name:"Privacy Policy",url:"/privacy-policy/",type:"legal",intent:"Navigational",schema:["WebPage"],
  note:"Indexable but low priority. Needs a title, meta and canonical only.",
  p:"Premier privacy policy",s:[],q:[],e:["Premier Family Business Consulting","Data Privacy Act of 2012 (Philippines)"]}
];

const TEMPL = Object.fromEntries(PAGES.map(p=>[p.id,p]));

function blank(t){
  return {id:t.id,name:t.name,url:t.url,type:t.type,status:"Not started",owner:"",intent:t.intent||"",markets:["Global (English)","Philippines","Southeast Asia"],
    primary:t.p||"",volume:"",competitor:"",secondary:"",questions:"",entities:"",
    seoTitle:"",metaDesc:"",ogImage:"",ogAlt:"",h1:"",answer:"",outline:"",body:"",
    faqs:[],takeaways:"",proof:"",author:"",creds:"",reviewer:"",reviewed:"",
    internal:"",external:"",images:"",schema:[...(t.schema||["WebPage"])],tech:{},custom:!!t.custom,updatedAt:0};
}
function tmplFor(b){ return TEMPL[b.id] || {id:b.id,name:b.name,url:b.url,type:b.type,p:"",s:[],q:[],e:GLOBAL_ENT,schema:["Article","BreadcrumbList"],note:"Custom page. Pick keywords from the playbook's content calendar or your keyword tool."}; }

/* ---------- text helpers ---------- */
const lines = s => (s||"").split(/\n/).map(x=>x.trim()).filter(Boolean);
const words = s => (s||"").toLowerCase().match(/[a-z0-9À-ɏ'’-]+/g) || [];
const esc = s => String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
const norm = s => (s||"").toLowerCase().replace(/[’']/g,"").replace(/[^a-z0-9À-ɏ]+/g," ").trim();
function countPhrase(text, phrase){ const t = " "+norm(text)+" ", p = norm(phrase); if(!p) return 0; let n=0,i=0; const needle=" "+p+" "; while((i=t.indexOf(needle,i))>-1){n++; i+=needle.length-1;} return n; }
function hasAllWords(text, phrase){ const t = new Set(words(norm(text))); const stop = new Set(["a","an","the","of","for","in","to","and","how","do","you","is"]); return words(norm(phrase)).filter(w=>!stop.has(w)).every(w=>t.has(w) || t.has(w.replace(/s$/,"")) || t.has(w+"s")); }
function syll(w){ w=w.toLowerCase().replace(/[^a-z]/g,""); if(w.length<=3) return 1; w=w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/,"").replace(/^y/,""); const m=w.match(/[aeiouy]{1,2}/g); return m?m.length:1; }
function textStats(body){
  const w = words(body), wc = w.length;
  const sentences = (body||"").split(/[.!?]+(?:\s|$)/).map(s=>s.trim()).filter(s=>words(s).length>2);
  const sc = Math.max(1, sentences.length);
  const sy = w.reduce((a,x)=>a+syll(x),0);
  const flesch = wc ? Math.round(206.835 - 1.015*(wc/sc) - 84.6*(sy/Math.max(1,wc))) : 0;
  const paras = (body||"").split(/\n\s*\n|\n/).map(p=>words(p).length).filter(n=>n>0);
  return {wc, avgSent: wc? +(wc/sc).toFixed(1):0, flesch, longPara: paras.filter(n=>n>120).length, paraCount: paras.length};
}
const days = iso => iso ? (Date.now()-new Date(iso+"T00:00:00").getTime())/864e5 : Infinity;

/* ---------- rules ---------- */
function evaluate(b){
  const t = tmplFor(b), type = b.type, legal = type==="legal";
  const R = [];
  const add = (g,label,state,hint) => R.push({g,label,state,hint});
  const P = b.primary.trim(), sec = lines(b.secondary), qs = lines(b.questions), ents = lines(b.entities);
  const st = textStats(b.body), target = TARGET_WORDS[type] ?? 600;
  const outline = lines(b.outline), h2 = outline.filter(l=>/^##\s/.test(l)&&!/^###/.test(l));
  const faqs = (b.faqs||[]).filter(f=>f.q && f.a);
  const internal = lines(b.internal), external = lines(b.external), imgs = lines(b.images);

  // Keywords
  add("Keywords","Primary keyword set", P?"pass":"fail","Pick one phrase the page should own.");
  add("Keywords","Search volume checked", b.volume.trim()?"pass":"warn","Record the volume from Keyword Planner or Semrush.");
  if(!legal){
    add("Keywords","2–8 secondary keywords", sec.length>=2&&sec.length<=8?"pass":sec.length?"warn":"fail", `You have ${sec.length}. Use the suggestions above.`);
    add("Keywords","3+ questions to answer", qs.length>=3?"pass":qs.length?"warn":"fail","Questions become H2s and FAQs: the core of AEO.");
    add("Keywords","Search intent chosen", b.intent?"pass":"warn","Tells the writer whether to teach, compare or convert.");
    add("Keywords","3+ entities listed", ents.length>=3?"pass":"warn","People, credentials, places and organisations.");
  }
  // Search appearance
  const tl = b.seoTitle.length, ml = b.metaDesc.length;
  add("Search appearance","SEO title 30–60 characters", tl>=30&&tl<=60?"pass":tl&&tl<=65?"warn":"fail", tl?`${tl} characters.`:"Write the title.");
  if(P){ const pos = norm(b.seoTitle).indexOf(norm(P)); add("Search appearance","Primary keyword in title, near the start", pos>-1&&pos<=25?"pass":(pos>-1||hasAllWords(b.seoTitle,P))?"warn":"fail","Lead with it; put \"| Premier\" at the end."); }
  add("Search appearance","Meta description 120–160 characters", ml>=120&&ml<=160?"pass":ml>=90&&ml<=175?"warn":"fail", ml?`${ml} characters.`:"Write the description.");
  if(P) add("Search appearance","Primary keyword in meta description", countPhrase(b.metaDesc,P)?"pass":hasAllWords(b.metaDesc,P)?"warn":"fail","Google bolds it in results.");
  const slug = (b.url||"").replace(/^https?:\/\/[^/]+/,"");
  const slugOk = /^\/[a-z0-9\/-]*$/.test(slug) && (slug.split("/").pop()||slug.split("/").slice(-2)[0]||"").split("-").length<=6;
  add("Search appearance","Clean URL: lowercase, hyphens, short", slug && slugOk?"pass":"warn","Example: /what-we-do/family-governance/");
  if(!legal) add("Search appearance","Social image and alt text", b.ogImage&&b.ogAlt?"pass":"warn","1200×630 image, descriptive file name.");
  // Content
  if(P && !legal) add("Content","H1 contains the primary keyword", b.h1 && (countPhrase(b.h1,P)||hasAllWords(b.h1,P))?"pass":b.h1?"warn":"fail","One H1, natural phrasing.");
  if(!legal){
    add("Content","3+ H2 sections in the outline", h2.length>=3?"pass":h2.length?"warn":"fail",`${h2.length} H2s so far.`);
    add("Content","At least one H2 phrased as a question", h2.some(l=>/\?\s*$/.test(l))?"pass":"warn","\"How long does succession take?\" is what people type.");
    add("Content",`Body ${target}+ words`, st.wc>=target?"pass":st.wc>=target*0.6?"warn":"fail",`${st.wc} words.`);
    if(P) add("Content","Primary keyword in the first 100 words", st.wc && (countPhrase(words(b.body).slice(0,100).join(" "),P) || hasAllWords(words(b.body).slice(0,100).join(" "),P))?"pass":"fail","Say what the page is about straight away.");
    if(P && st.wc){ const d = countPhrase(b.body,P)*words(P).length/st.wc*100; add("Content","Primary keyword density 0.5–2.5%", d>=0.5&&d<=2.5?"pass":d>2.5?"fail":"warn",`${d.toFixed(2)}%${d>2.5?": reads as stuffing":""}.`); }
    if(sec.length){ const used = sec.filter(s=>countPhrase(b.body,s)||hasAllWords(b.body,s)).length; add("Content","Half the secondary keywords used", used>=Math.ceil(sec.length/2)?"pass":used?"warn":"fail",`${used} of ${sec.length} appear in the body.`); }
    if(st.wc) add("Content","Sentences average 22 words or fewer", st.avgSent<=22?"pass":st.avgSent<=26?"warn":"fail",`Average ${st.avgSent}. Reading ease ${st.flesch}.`);
    if(st.wc) add("Content","No paragraph over 120 words", st.longPara===0?"pass":"warn",`${st.longPara} long paragraph${st.longPara===1?"":"s"}.`);
  }
  // AEO
  if(!legal){
    const aw = words(b.answer).length;
    add("Answer engines","Direct answer 40–60 words", aw>=40&&aw<=60?"pass":aw>=25&&aw<=80?"warn":"fail", aw?`${aw} words.`:"Write the answer that sits under the H1.");
    if(P) add("Answer engines","Direct answer names the topic", aw && (countPhrase(b.answer,P)||hasAllWords(b.answer,P))?"pass":"warn","Quoted alone, it must still say what it is about.");
    const needFaq = ["service","faq","article","home"].includes(type);
    add("Answer engines", needFaq?"3+ FAQs with answers":"FAQs (optional here)", faqs.length>=3?"pass":needFaq?(faqs.length?"warn":"fail"):"pass",`${faqs.length} complete.`);
    if(faqs.length){ const bad = faqs.filter(f=>{const n=words(f.a).length; return n<20||n>100;}).length; add("Answer engines","FAQ answers 20–100 words", bad?"warn":"pass", bad?`${bad} outside the range.`:"Good length for rich results."); }
    if(qs.length){ const hay = b.outline+"\n"+faqs.map(f=>f.q).join("\n")+"\n"+b.body; const cov = qs.filter(q=>hasAllWords(hay,q)).length; add("Answer engines","Target questions answered on the page", cov>=qs.length?"pass":cov>=Math.ceil(qs.length/2)?"warn":"fail",`${cov} of ${qs.length} covered in H2s, FAQs or body.`); }
    add("Answer engines","Author named with credentials", b.author&&b.creds?"pass":b.author?"warn":"fail","E-E-A-T: who wrote it and why they know.");
    add("Answer engines","Expert review within 12 months", b.reviewer&&days(b.reviewed)<=366?"pass":b.reviewed?"warn":"fail","Show \"Reviewed by … on …\" on the page.");
    if(["service","article","home","faq"].includes(type)) add("Answer engines","A stat with its source", lines(b.proof).some(l=>/\|\s*https?:\/\//.test(l))?"pass":"warn","\"claim | https://source\". Engines cite pages that cite.");
    add("Answer engines","3+ key takeaways", lines(b.takeaways).length>=3?"pass":"warn","Short list near the top or end: easy to extract.");
    if(ents.length && st.wc){ const m = ents.filter(e=>hasAllWords(b.body+" "+b.answer, e.replace(/\(.*?\)/g,""))).length; add("Answer engines","Entities mentioned in the copy", m>=Math.ceil(ents.length/2)?"pass":"warn",`${m} of ${ents.length}.`); }
  }
  // Links & media
  if(!legal){
    const vague = internal.filter(l=>/^(click here|here|read more|learn more|more)\s*\|/i.test(l)).length;
    add("Links & media","3+ internal links", internal.length>=3?(vague?"warn":"pass"):internal.length?"warn":"fail", vague?`${vague} vague anchor${vague>1?"s":""}. Describe the destination.`:`${internal.length} planned.`);
    if(type!=="contact") add("Links & media","Links to Book a Family Business Review", internal.some(l=>/contact|book/i.test(l))?"pass":"warn","Every page ends with the booking CTA.");
    if(["service","article","faq"].includes(type)) add("Links & media","1+ authoritative external source", external.length?"pass":"warn","FFI, academic research, government statistics.");
    const badImg = imgs.filter(l=>{const [f,a]=l.split("|").map(x=>(x||"").trim()); return !a || !/^[a-z0-9-]+\.(jpe?g|png|webp|avif|gif|svg)$/.test(f) || /^(img|dsc|hf_|image|photo|screenshot)[-_0-9]/i.test(f);}).length;
    add("Links & media","Images: descriptive file names and alt text", imgs.length? (badImg?"warn":"pass"):"warn", imgs.length? (badImg?`${badImg} need work.`:`${imgs.length} ready.`):"List every image on the page.");
  }
  // Schema & technical
  add("Schema & tech","Schema types selected", (b.schema||[]).length?"pass":"fail","See the suggestions for this page type.");
  if(faqs.length) add("Schema & tech","FAQPage schema for the FAQs", b.schema.includes("FAQPage")?"pass":"warn","Tick FAQPage below.");
  const tk = TECH.filter(([k])=>b.tech&&b.tech[k]).length;
  add("Schema & tech","Technical checklist", tk===TECH.length?"pass":tk>=6?"warn":"fail",`${tk} of ${TECH.length} done.`);
  return R;
}
const WEIGHTS = {"Keywords":15,"Search appearance":20,"Content":25,"Answer engines":20,"Links & media":10,"Schema & tech":10};
function scoreOf(R){
  const g = {};
  R.forEach(r=>{ (g[r.g]=g[r.g]||{p:0,n:0}); g[r.g].n++; g[r.g].p += r.state==="pass"?1:r.state==="warn"?.5:0; });
  let tot=0, wsum=0; Object.entries(g).forEach(([k,v])=>{ const w = WEIGHTS[k]||10; tot += w*v.p/v.n; wsum += w; });
  return {groups:g, total: wsum? Math.round(tot/wsum*100):0, fails: R.filter(r=>r.state==="fail").length};
}


/* ---------- JSON-LD ---------- */
function abs(u){ return /^https?:/.test(u||"") ? u : SITE + (u||"/"); }
function jsonld(b){
  const url = abs(b.url), g = [];
  const orgId = SITE+"/#organization";
  const org = {"@type":"Organization","@id":orgId,name:ORG.name,url:SITE+"/",logo:SITE+"/wp-content/uploads/2026/09/premier-family-business-consulting-logo.png",email:ORG.email,telephone:ORG.phone,sameAs:ORG.sameAs,
    founder:{"@type":"Person",name:"Jonathan A. Ramos"}};
  const author = b.author ? {"@type":"Person",name:b.author,...(b.creds?{hasCredential:b.creds}:{}),worksFor:{"@id":orgId}} : undefined;
  const faqs = (b.faqs||[]).filter(f=>f.q&&f.a);
  const areas = b.markets.map(m=>m.startsWith("Global")?"Worldwide":m.replace(/ \/.*$/,""));
  b.schema.forEach(s=>{
    if(s==="Organization") g.push(org);
    if(s==="ProfessionalService") g.push({"@type":"ProfessionalService","@id":SITE+"/#localbusiness",name:ORG.name,url:SITE+"/",telephone:ORG.phone,image:org.logo,
      address:{"@type":"PostalAddress",streetAddress:ORG.street,addressLocality:ORG.city,addressCountry:ORG.country},areaServed:areas,parentOrganization:{"@id":orgId}});
    if(s==="WebPage"||s==="ContactPage"||s==="CollectionPage") g.push({"@type":s,"@id":url+"#webpage",url,name:b.seoTitle||b.name,description:b.metaDesc||undefined,inLanguage:"en",isPartOf:{"@type":"WebSite",url:SITE+"/",name:"Premier Family Business Consulting"},
      ...(b.reviewed?{lastReviewed:b.reviewed,dateModified:b.reviewed}:{}),...(b.reviewer?{reviewedBy:{"@type":"Person",name:b.reviewer}}:{}),...(b.primary?{about:b.primary}:{})});
    if(s==="BreadcrumbList"){ const segs=(b.url||"/").split("/").filter(Boolean); const items=[{"@type":"ListItem",position:1,name:"Home",item:SITE+"/"}];
      segs.forEach((sg,i)=>items.push({"@type":"ListItem",position:i+2,name:i===segs.length-1?b.name:sg.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase()),item:SITE+"/"+segs.slice(0,i+1).join("/")+"/"}));
      g.push({"@type":"BreadcrumbList",itemListElement:items}); }
    if(s==="Service") g.push({"@type":"Service",name:b.h1||b.name,serviceType:b.primary||b.name,description:b.metaDesc||undefined,provider:{"@id":orgId},areaServed:areas,url});
    if(s==="FAQPage") g.push({"@type":"FAQPage",mainEntity:(faqs.length?faqs:[{q:"Add FAQs in section 5",a:"…"}]).map(f=>({"@type":"Question",name:f.q,acceptedAnswer:{"@type":"Answer",text:f.a}}))});
    if(s==="HowTo"){ const steps=lines(b.outline).filter(l=>/^##\s/.test(l)&&!/^###/.test(l)).map(l=>l.replace(/^##\s*/,"")); g.push({"@type":"HowTo",name:b.h1||b.name,description:b.answer||undefined,step:(steps.length?steps:["Add H2 steps in the outline"]).map((x,i)=>({"@type":"HowToStep",position:i+1,name:x}))}); }
    if(s==="Article") g.push({"@type":"Article",headline:b.h1||b.seoTitle||b.name,description:b.metaDesc||undefined,mainEntityOfPage:url,author:author||{"@type":"Person",name:"Author name"},publisher:{"@id":orgId},
      ...(b.ogImage?{image:SITE+"/wp-content/uploads/"+b.ogImage}:{}),...(b.reviewed?{dateModified:b.reviewed}:{}),datePublished:"YYYY-MM-DD",keywords:[b.primary,...lines(b.secondary)].filter(Boolean).join(", ")});
    if(s==="Person") g.push(author?{...author,url,sameAs:["https://www.linkedin.com/in/…"]}:{"@type":"Person",name:"Person name",jobTitle:"…",worksFor:{"@id":orgId},sameAs:["https://www.linkedin.com/in/…"]});
    if(s==="Event") g.push({"@type":"Event",name:"Event name",startDate:"YYYY-MM-DDTHH:MM+08:00",eventAttendanceMode:"https://schema.org/OfflineEventAttendanceMode",location:{"@type":"Place",name:"Venue",address:"City, Philippines"},organizer:{"@id":orgId},url});
    if(s==="Book") g.push({"@type":"Book",name:"Legacy in Action",author:{"@type":"Person",name:"Jonathan A. Ramos"},publisher:{"@id":orgId},url,isbn:"…"});
    if(s==="PodcastSeries") g.push({"@type":"PodcastSeries",name:"Legacy in Action Podcast",url,author:{"@type":"Person",name:"Jonathan A. Ramos"},webFeed:"…"});
  });
  return {"@context":"https://schema.org","@graph":g};
}

/* ---------- markdown brief ---------- */
function briefMd(b){
  const sc = scoreOf(evaluate(b)), L = s => lines(s).map(x=>"- "+x).join("\n")||"- (none)";
  return `# SEO brief: ${b.name}

**URL:** ${abs(b.url)}  \n**Type:** ${TYPE_LABEL[b.type]}  ·  **Status:** ${b.status}  ·  **Owner:** ${b.owner||"-"}  ·  **Readiness:** ${sc.total}%
**Intent:** ${b.intent||"-"}  ·  **Markets:** ${b.markets.join(", ")}

## Keywords
**Primary:** ${b.primary||"-"}${b.volume?` (${b.volume})`:""}
**Competitor to beat:** ${b.competitor||"-"}

**Secondary**
${L(b.secondary)}

**Questions to answer**
${L(b.questions)}

**Entities**
${L(b.entities)}

## Search appearance
**SEO title (${b.seoTitle.length}):** ${b.seoTitle||"-"}
**Meta description (${b.metaDesc.length}):** ${b.metaDesc||"-"}
**OG image:** ${b.ogImage||"-"} (alt: ${b.ogAlt||"-"})

## Content
**H1:** ${b.h1||"-"}

**Direct answer:** ${b.answer||"-"}

**Outline**
${b.outline||"(none)"}

**Key takeaways**
${L(b.takeaways)}

## FAQs
${(b.faqs||[]).map(f=>`**Q: ${f.q}**\n${f.a}`).join("\n\n")||"(none)"}

## Proof and authorship
${L(b.proof)}
**Author:** ${b.author||"-"} ${b.creds?`(${b.creds})`:""}  ·  **Reviewer:** ${b.reviewer||"-"}  ·  **Reviewed:** ${b.reviewed||"-"}

## Links and images
**Internal**
${L(b.internal)}

**External**
${L(b.external)}

**Images**
${L(b.images)}

## Schema
${b.schema.join(", ")}

\`\`\`json
${JSON.stringify(jsonld(b),null,2)}
\`\`\`
`;
}


export { SITE, ORG, MARKETS, SCHEMAS, TECH, GLOBAL_ENT, TARGET_WORDS, TYPE_LABEL, PAGES, TEMPL, WEIGHTS,
  blank, tmplFor, lines, words, esc, norm, countPhrase, hasAllWords, textStats, evaluate, scoreOf, jsonld, abs, briefMd };

// Human labels for brief fields, used in change history.
export const FIELD_LABELS = {
  name:"Page name", url:"URL", type:"Page type", status:"Status", owner:"Owner", intent:"Search intent", markets:"Target markets",
  primary:"Primary keyword", volume:"Search volume", competitor:"Competitor", secondary:"Secondary keywords", questions:"Questions", entities:"Entities",
  seoTitle:"SEO title", metaDesc:"Meta description", ogImage:"OG image", ogAlt:"OG image alt", h1:"H1", answer:"Direct answer", outline:"Outline", body:"Body copy",
  faqs:"FAQs", takeaways:"Key takeaways", proof:"Stats and sources", author:"Author", creds:"Author credentials", reviewer:"Reviewer", reviewed:"Last reviewed",
  internal:"Internal links", external:"External sources", images:"Images", schema:"Schema types", tech:"Technical checklist"
};
export function changedFields(a, b) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  keys.delete("updatedAt"); keys.delete("id"); keys.delete("custom");
  return [...keys].filter(k => JSON.stringify(a?.[k] ?? "") !== JSON.stringify(b?.[k] ?? ""));
}
