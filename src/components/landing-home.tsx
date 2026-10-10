"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon, type IconName } from "./icon";
import { Reveal, ScrollLink } from "./motion";
import styles from "./landing-home.module.css";

const DEMO = "/dashboard?q=P01&asof=2026-10-01";
const tabs = ["Summary", "Evidence path", "Stakeholders", "Precedents"] as const;
type PreviewTab = (typeof tabs)[number];
const sources: { name: string; icon: IconName }[] = [
  { name: "CRM", icon: "contacts" },
  { name: "Interactions", icon: "mail" },
  { name: "Product usage", icon: "usage" },
  { name: "Support", icon: "ticket" },
  { name: "Contracts", icon: "wallet" },
  { name: "Decision log", icon: "book" },
];
const features: Record<PreviewTab, { title: string; description: string; detail: string }> = {
  Summary: {
    title: "The right person.\nThe context behind them.",
    description: "A contact list gives you names. Decidely connects authority claims with employment history to show who holds the purchase decision at your reference date.",
    detail: "Unconfirmed roles stay visible, so you know what to ask next.",
  },
  "Evidence path": {
    title: "An answer you\ncan trace back.",
    description: "Follow the finding to the email and employment record behind it. Inspect the original excerpt, source file, and row in the same workspace.",
    detail: "Keep the proof close to the conversation.",
  },
  Stakeholders: {
    title: "A better way\ninto the conversation.",
    description: "Separate the decision maker from the technical evaluator. Use the contact plan to find an introduction route through someone already involved.",
    detail: "Give your account owner a concrete next step.",
  },
  Precedents: {
    title: "The history worth\nbringing to the meeting.",
    description: "People move between companies. Earlier feature promises and decisions can still matter. Decidely connects that history to the current account.",
    detail: "Prepare with relevant history while keeping uncertain impact explicit.",
  },
};

function AccountPreview({ tab, onTabChange, id }: { tab: PreviewTab; onTabChange: (tab: PreviewTab) => void; id: string }) {
  return (
    <div className={styles.preview}>
      <div className={styles.previewTop}><span className={styles.windowDots} aria-hidden><i /><i /><i /></span><span>decidely / account workspace</span><Icon name="sidebar" /></div>
      <div className={styles.previewAccount}><div><span className={styles.accountIcon}><Icon name="building" /></span><strong>Grup Ritel Mandala</strong></div><span>01 OCT 2026</span></div>
      <div className={styles.previewTabs} role="tablist" aria-label={`${id} account preview`}>
        {tabs.map((name) => <button key={name} type="button" role="tab" aria-selected={tab === name} aria-controls={`${id}-panel`} id={`${id}-${name.replaceAll(" ", "-")}`} tabIndex={tab === name ? 0 : -1} onClick={() => onTabChange(name)} onKeyDown={(event) => {
          if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (tabs.indexOf(name) + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
          onTabChange(tabs[next]);
          document.getElementById(`${id}-${tabs[next].replaceAll(" ", "-")}`)?.focus();
        }}>{name}</button>)}
      </div>
      <div className={styles.previewBody} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${tab.replaceAll(" ", "-")}`}>
        {tab === "Summary" && <>
          <div className={styles.decisionCard}><div className={styles.previewLabel}>PURCHASE DECISION<span><i />Across sources</span></div><div className={styles.person}><div className={styles.avatar}>RH</div><div><h3>Rina Hapsari</h3><p>GM Operations</p></div><Icon name="arrow" /></div><div className={styles.cardEvidence}><Icon name="mail" /><span>Email I0343</span><span className={styles.evidencePlus}>+</span><Icon name="contacts" /><span>Employment history</span></div></div>
          <div className={styles.previewColumns}><div><span className={styles.smallLabel}>NEXT STEP</span><p>Ask Fajar to introduce Rina.</p><span className={styles.owner}><span>BP</span>Bagus Prakoso</span></div><div><span className={styles.smallLabel}>STILL UNKNOWN</span><p className={styles.unknownText}>Budget approval<br />Final contract signer</p></div></div>
        </>}
        {tab === "Evidence path" && <>
          <div className={styles.evidenceFlow}><div><Icon name="mail" /><strong>Email I0343</strong><span>“The new GM decides.”</span></div><span className={styles.flowJoin}>+</span><div><Icon name="contacts" /><strong>Employment history</strong><span>GM Operations since 1 Sep</span></div></div>
          <div className={styles.flowArrow} aria-hidden>↓</div><div className={styles.resolvedPerson}><span className={styles.avatar}>RH</span><div><strong>Rina Hapsari</strong><span>Supported across sources</span></div><Icon name="graph" /></div>
          <Link href={`${DEMO}&tab=graph`} className={styles.previewLink}>Inspect the original sources<Icon name="arrow" /></Link>
        </>}
        {tab === "Stakeholders" && <>
          <div className={styles.contactRow}><span className={styles.avatar}>RH</span><div><strong>Rina Hapsari</strong><span>GM Operations</span></div><span className={styles.roleTag}>Decision maker</span></div>
          <div className={styles.contactRow}><span className={`${styles.avatar} ${styles.blueAvatar}`}>FN</span><div><strong>Fajar Nugraha</strong><span>IT Manager</span></div><span className={styles.roleTag}>Technical evaluator</span></div>
          <div className={styles.introduction}><Icon name="chat" /><p><strong>Your introduction route</strong>Bagus asks Fajar to introduce Rina.</p></div>
        </>}
        {tab === "Precedents" && <>
          <div className={styles.precedentTitle}><Icon name="book" /><div><span className={styles.smallLabel}>D-2025-11 / FORMER EMPLOYER</span><strong>Accounting integration promise</strong></div></div><div className={styles.promise}><span>FEAT-07</span><span>Still in development</span></div><p className={styles.precedentCopy}>An earlier commitment at Kopi Lintas Nusantara. Rina worked there when the decision was made.</p><div className={styles.introduction}><Icon name="compass" /><p><strong>Prepare for the meeting</strong>Bring an accurate answer on integration readiness.</p></div>
        </>}
      </div>
      <div className={styles.previewFooter}><span><i />Illustrative P01 account</span><Link href={DEMO}>Open workspace<Icon name="arrow" /></Link></div>
    </div>
  );
}

export function LandingHome() {
  const [heroTab, setHeroTab] = useState<PreviewTab>("Summary");
  const [featureTab, setFeatureTab] = useState<PreviewTab>("Summary");
  const feature = features[featureTab];
  return (
    <main id="top" data-landing className={styles.landing}>
      <section className={styles.hero} aria-labelledby="hero-heading">
        <Reveal className={styles.heroCopy}>
          <p className={styles.eyebrow}><span />DECISION MAKER DISCOVERY</p>
          <h1 id="hero-heading">Know who<br />decides.<br /><span>Know why.</span></h1>
          <p className={styles.heroDescription}>Bring scattered account records into one view. Find the decision maker, follow the evidence, and prepare your next conversation.</p>
          <div className={styles.heroActions}><Link href={DEMO} className={styles.primaryCta}>Explore the demo<Icon name="arrow" /></Link><ScrollLink href="/#entry" className={styles.textCta}>See how it works<Icon name="graph" /></ScrollLink></div>
          <div className={styles.heroPills} aria-label="Explore the product preview"><button type="button" className={styles.sagePill} onClick={() => setHeroTab("Summary")}>Decision makers<Icon name="contacts" /></button><button type="button" className={styles.bluePill} onClick={() => setHeroTab("Evidence path")}>Evidence paths<Icon name="graph" /></button><button type="button" className={styles.amberPill} onClick={() => setHeroTab("Stakeholders")}>Next steps<Icon name="arrow" /></button></div>
        </Reveal>
        <Reveal className={styles.heroVisual} delay={0.12}>
          <div className={styles.topAnnotation}><Icon name="graph" /><span>One account.<br /><strong>The connected context.</strong></span></div>
          <div className={styles.heroWindow}><AccountPreview id="hero" tab={heroTab} onTabChange={setHeroTab} /></div>
          <div className={styles.floatingEmail}><div><Icon name="mail" /><span>EMAIL I0343</span><span>24 SEP</span></div><blockquote>“The new GM decides.<br />I evaluate the technical side.”</blockquote><span>Fajar Nugraha / IT Manager</span></div>
          <span className={styles.visualCaption}>A real question. An inspectable answer.</span>
        </Reveal>
      </section>

      <section className={styles.sources} aria-label="Account data sources"><p>The context is already in your records.</p><div>{sources.map((source) => <span key={source.name}><Icon name={source.icon} />{source.name}</span>)}</div></section>

      <section id="problem" className={styles.problem}>
        <Reveal className={styles.sectionHeading}><p className={styles.eyebrow}>THE MISSING CONTEXT</p><h2>Six sources.<br />One conversation to prepare.</h2><p>A name in CRM. A role in an email. A promise in the decision log.<br className={styles.desktopBreak} /> The answer lives in the connections between them.</p></Reveal>
        <div className={styles.fragments}>
          <Reveal><span className={styles.fragmentIcon}><Icon name="mail" /></span><p className={styles.smallLabel}>THE EMAIL</p><blockquote>“The <span>new GM</span> makes the purchase decision.”</blockquote><p>A role, without a name.</p></Reveal>
          <Reveal delay={0.08}><span className={styles.fragmentIcon}><Icon name="contacts" /></span><p className={styles.smallLabel}>THE EMPLOYMENT RECORD</p><blockquote>Rina joined as <span>GM Operations</span> in September.</blockquote><p>A name, valid at the right time.</p></Reveal>
          <Reveal delay={0.16}><span className={styles.fragmentIcon}><Icon name="book" /></span><p className={styles.smallLabel}>THE EARLIER COMMITMENT</p><blockquote>The integration promise is <span>still open.</span></blockquote><p>The history to prepare for.</p></Reveal>
        </div>
        <p className={styles.caseNote}>Illustrative records from the P01 prototype case.</p>
      </section>

      <section id="entry" className={styles.product}>
        <Reveal className={styles.sectionHeading}><p className={styles.eyebrow}>THE ACCOUNT WORKSPACE</p><h2>A clear answer.<br />A path you can inspect.</h2><p>Everything you need to prepare, in the same account view.</p></Reveal>
        <div className={styles.featureNav} aria-label="Product features">{tabs.map((tab, index) => <button key={tab} type="button" aria-pressed={featureTab === tab} onClick={() => setFeatureTab(tab)}><span>0{index + 1}</span>{tab}<Icon name="arrow" /></button>)}</div>
        <div className={styles.featureContent}>
          <div className={styles.featureCopy}><span className={styles.featureNumber}>0{tabs.indexOf(featureTab) + 1}</span><h3>{feature.title}</h3><p>{feature.description}</p><p className={styles.featureDetail}>{feature.detail}</p><Link href={`${DEMO}${featureTab === "Evidence path" ? "&tab=graph" : featureTab === "Stakeholders" ? "&tab=people" : featureTab === "Precedents" ? "&tab=precedents" : ""}`} className={styles.textCta}>Explore {featureTab.toLowerCase()}<Icon name="arrow" /></Link></div>
          <div className={styles.featurePreview}><AccountPreview id="feature" tab={featureTab} onTabChange={setFeatureTab} /></div>
        </div>
      </section>

      <section id="trace" className={styles.how}>
        <Reveal className={styles.howHeading}><p className={styles.eyebrow}>CONNECTED CONTEXT, EXPLAINED</p><h2>The records stay connected.<br /><span>The finding stays grounded.</span></h2><p>Graph relationships make history retrievable. AI reads authority in text. Evidence rules decide what the app can support.</p></Reveal>
        <div className={styles.howGrid}>
          <Reveal><span className={styles.howIcon}><Icon name="graph" /></span><span className={styles.techLabel}>NEO4J</span><h3>Connect the history</h3><p>Link people, employment dates, accounts, and prior decisions. Explore related records from a selected entity.</p><div className={styles.miniPath}><span>Rina</span><Icon name="arrow" /><span>Former employer</span><Icon name="arrow" /><span>Promise</span></div></Reveal>
          <Reveal delay={0.08}><span className={styles.howIcon}><Icon name="compass" /></span><span className={styles.techLabel}>JEV</span><h3>Interpret the claim</h3><p>Identify authority claims in interactions using contacts valid on that date. Reuse stored judgments while their inputs remain valid.</p><div className={styles.miniJudgment}><span>Purchase authority</span><strong>0.96</strong><span>Recorded P01 judgment</span></div></Reveal>
          <Reveal delay={0.16}><span className={styles.howIcon}><Icon name="book" /></span><span className={styles.techLabel}>EVIDENCE RULES</span><h3>Keep uncertainty visible</h3><p>Check the claim and the person match before assigning a supported status. Leave unanswered roles explicit.</p><div className={styles.miniStatuses}><span>Decision maker <i>Supported</i></span><span>Final signer <i>Unknown</i></span></div></Reveal>
        </div>
        <div className={styles.chatLine}><Icon name="chat" /><p><strong>A follow-up question, with context.</strong> Ask AI queries the graph and explains the returned facts with source references.</p><Link href={DEMO} className={styles.textCta}>Open Ask AI<Icon name="arrow" /></Link></div>
      </section>

      <section id="faq" className={styles.faq}>
        <div><p className={styles.eyebrow}>A FEW THINGS TO KNOW</p><h2>Before your<br />next conversation.</h2></div>
        <div className={styles.faqList}>{[
          ["What does Decidely help me find?", "The person holding the purchase decision, the sources behind the finding, a possible introduction route, and relevant earlier commitments. It also shows roles that still need confirmation."],
          ["Can I inspect the original evidence?", "Yes. Evidence Path links findings to source records. The Source panel shows the original excerpt, file, and row so you can check the basis of the answer."],
          ["What happens when the evidence is incomplete?", "The app keeps the role unknown or marks the evidence as insufficient. A supported decision maker does not automatically establish budget approval or signing authority."],
          ["What data does the demo use?", "The prototype uses synthetic KasirNusa CSV and JSONL records. The companies and people are fictional. The source categories illustrate the connected workflow, not live integrations."],
        ].map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden>+</span></summary><p>{answer}</p></details>)}</div>
      </section>

      <section className={styles.closing}>
        <Reveal><p className={styles.eyebrow}>YOUR NEXT CONVERSATION</p><h2>Go in prepared.<br /><span>Bring the evidence.</span></h2><p>Start with an account. Leave with a contact plan.</p><Link href={DEMO} className={styles.primaryCta}>Explore Decidely<Icon name="arrow" /></Link></Reveal>
        <div className={styles.closingMark} aria-hidden><Icon name="graph" /></div>
      </section>
    </main>
  );
}
