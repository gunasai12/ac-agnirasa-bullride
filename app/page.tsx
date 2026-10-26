"use client";

import { FormEvent, useEffect, useState } from "react";
import QRCode from "qrcode";

const packages = {
  single: { name: "Single Ride", price: 150, riders: 1, line: "One ride. A big story.", color: "gold" },
  five: { name: "Fearless Five", price: 750, riders: 6, line: "Buy 5 tickets, get 1 extra free!", color: "red" },
  triple: { name: "Triple Thrill", price: 420, riders: 3, line: "3 rides. More memories.", color: "blue" },
  duo: { name: "Duo Ride", price: 280, riders: 2, line: "Ride with a friend. Double the fun!", color: "purple" },
} as const;
type PackageKey = keyof typeof packages;
type Rider = { name: string; course: string };

const rules = [
  "Age limit: 16+ only, as per university rules.",
  "Listen to the operator’s instructions before riding.",
  "Each ride lasts approximately 5 minutes; timing may vary for safety.",
  "If you fall, the ride stops immediately and that attempt ends.",
  "Do not touch the ground while riding. If your foot touches the ground, you are out.",
  "Follow all weight and health restrictions.",
  "People with back, neck or other medical issues should not ride.",
  "Only one person at a time. No pushing or standing near the bull.",
  "Hold the handle properly. Dismount only after the bull stops completely.",
  "The operator’s decision is final. No refunds once a ride starts.",
];

export default function Home() {
  const [chosen, setChosen] = useState<PackageKey>("duo");
  const [buyerName, setBuyerName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [riders, setRiders] = useState<Rider[]>([{ name: "", course: "" }, { name: "", course: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [upiQr, setUpiQr] = useState("");
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const upiId = process.env.NEXT_PUBLIC_PHONEPE_UPI_ID || "";
  useEffect(() => { if (upiId) QRCode.toDataURL(`upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent("AC Agnirasa Bull Ride")}&cu=INR`).then(setUpiQr).catch(() => setUpiQr("")); }, [upiId]);

  function selectPackage(key: PackageKey) {
    setChosen(key);
    setRiders(old => Array.from({ length: packages[key].riders }, (_, i) => old[i] || { name: "", course: "" }));
    setError(""); setNotice("");
  }
  function updateRider(i: number, field: keyof Rider, value: string) {
    setRiders(old => old.map((r, j) => i === j ? { ...r, [field]: value } : r));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice(""); setBookingRef("");
    try {
      const response = await fetch("/api/create-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ buyerName, email, mobile, riders, package: chosen }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save your booking.");
      setBookingRef(result.bookingId);
      setNotice("Booking saved. Scan the PhonePe UPI QR below and pay the exact amount. Your ticket will be emailed only after an admin verifies the payment.");
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  async function submitPaymentEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bookingRef) return;
    if (!paymentScreenshot) { setError("Please choose your payment screenshot."); return; }
    if (paymentReference.trim().length < 6) { setError("Enter your UPI transaction ID / UTR."); return; }
    setUploadBusy(true); setError(""); setNotice("");
    try {
      const form = new FormData();
      form.append("bookingId", bookingRef);
      form.append("paymentReference", paymentReference.trim());
      form.append("screenshot", paymentScreenshot);
      const response = await fetch("/api/payment-screenshot", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not submit payment evidence.");
      setNotice(result.message || "Payment evidence submitted.");
      setPaymentScreenshot(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not submit payment evidence."); }
    finally { setUploadBusy(false); }
  }

  return <main>
    <div className="top-strip"><span>⚡ UDYAMI BAZAAR</span><span>GD GOENKA UNIVERSITY</span><span>30 OCTOBER 2026</span></div>
    <nav className="nav"><a className="brand" href="#"><small>AC AGNIRASA PRESENTS</small><b>BULL <span>RIDE</span></b><em>DARE · RIDE · DOMINATE</em></a><a className="nav-cta" href="#book">GET TICKETS <span>↗</span></a></nav>
    <section className="hero"><div className="hero-glow"></div><div className="hero-copy"><p className="eyebrow">THE ULTIMATE RIDE IS HERE</p><h1>CAN YOU<br/><span>STAY ON?</span></h1><p>Test your strength, balance and courage. Bring your friends, take the ride and make a memory worth bragging about.</p><div className="event-meta"><span>📅 30 OCTOBER 2026</span><span>📍 UDYAMI BAZAAR · GD GOENKA UNIVERSITY</span></div><a className="primary-btn" href="#tickets">CHOOSE YOUR TICKET <span>→</span></a></div><div className="hero-burst"><span>EPIC RIDES</span><strong>GREAT VIBES</strong><span>UNFORGETTABLE MOMENTS!</span></div><div className="hero-bull" aria-hidden="true">🐂</div><div className="hero-bottom">D A R E &nbsp; T O &nbsp; R I D E</div></section>
    <section className="packages" id="tickets"><div className="section-title"><span>✦</span> PICK YOUR RIDE <span>✦</span></div><p className="section-subtitle">Choose a ticket package. Select it to start your booking.</p><div className="ticket-grid">
      {(Object.keys(packages) as PackageKey[]).map(key => <article className={"ticket-card ticket-" + packages[key].color + (chosen === key ? " selected" : "")} key={key}><div className="ticket-top"><span className="ticket-label">{packages[key].name}</span><span className="ticket-icon">⚡</span></div><div className="ticket-art" aria-hidden="true"><span>♞</span><i>✦</i></div><p className="ticket-price">₹{packages[key].price}</p><p className="ticket-desc">{packages[key].line}</p><p className="ticket-count">{packages[key].riders} RIDER{packages[key].riders === 1 ? "" : "S"} / TICKETS</p><button type="button" className="card-link" onClick={() => { selectPackage(key); document.getElementById("book")?.scrollIntoView({ behavior: "smooth" }); }}>{chosen === key ? "SELECTED ✓" : "SELECT PACKAGE →"}</button></article>)}
    </div><div className="offer-banner"><div className="offer-icon">🏆</div><div><p className="eyebrow">STAY ON & WIN!</p><h3>RIDE WITHOUT FALLING</h3><p>Get a chance to win a ₹50 Diet Coke prize. 5–10 winners advertised by the event team; ask the on-site operator for eligibility and prize rules.</p></div><span className="offer-price">₹50<small>PRIZE</small></span></div></section>
    <section className="booking-section" id="book"><div className="booking-intro"><p className="eyebrow">YOUR NEXT STORY STARTS HERE</p><h2>BOOK YOUR<br/><span>{packages[chosen].name.toUpperCase()}</span></h2><p>{packages[chosen].line}</p><ul className="benefits"><li>✓ {packages[chosen].riders} individual QR tickets</li><li>✓ Common PhonePe UPI QR payment</li><li>✓ Admin verifies payment before tickets are issued</li><li>✓ Event safety rules apply to every rider</li></ul><div className="price-box"><small>TOTAL PACKAGE PRICE</small><strong>₹{packages[chosen].price}</strong><span>{packages[chosen].riders} TICKET{packages[chosen].riders === 1 ? "" : "S"}</span></div><p className="small-note">Fearless Five includes 6 tickets for ₹750, as shown on the event poster.</p></div>
    <form className="booking-form" onSubmit={submit}><h3><span>01</span> Booking details</h3><p className="muted">Who should receive the booking confirmation?</p>
      <label>Buyer full name *<input required minLength={2} maxLength={100} autoComplete="name" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Enter your full name"/></label>
      <div className="form-row"><label>Email address *<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value.trim())} placeholder="you@example.com"/></label><label>Mobile number *<input required type="tel" pattern="[+]?[0-9 ()-]{8,18}" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="+91 98765 43210"/></label></div>
      <h3 className="rider-heading"><span>02</span> Rider details</h3><p className="muted">Enter the name and course for all {packages[chosen].riders} ticket holders.</p>
      {riders.map((r, i) => <div className="rider-card" key={i}><strong>RIDER {String(i + 1).padStart(2, "0")}</strong><label>Rider full name *<input required minLength={2} maxLength={100} value={r.name} onChange={e => updateRider(i, "name", e.target.value)} placeholder={"Rider " + (i + 1) + " full name"}/></label><label>Course / department *<input required minLength={2} maxLength={100} value={r.course} onChange={e => updateRider(i, "course", e.target.value)} placeholder="e.g. B.Tech CSE"/></label></div>)}
      <label className="consent"><input type="checkbox" required/> I confirm these details are correct and agree to follow the event rules and safety instructions.</label>
      {error && <p className="message error" role="alert">{error}</p>}{notice && <p className="message success" role="status">{notice}</p>}
      <button className="pay-btn" disabled={busy} type="submit">{busy ? "SAVING BOOKING…" : "SAVE BOOKING & SHOW PAYMENT QR →"}</button><p className="secure-note">Booking remains pending until the admin verifies your actual payment. Upload your screenshot and transaction ID below.</p>{bookingRef && <div className="payment-pending" style={{marginTop:20,padding:20,border:"1px solid #d6b43b",borderRadius:12}}><h3>Booking saved — reference {bookingRef.slice(0,8).toUpperCase()}</h3><p>Pay exactly ₹{packages[chosen].price} using PhonePe, then keep the UPI transaction ID/UTR for reference.</p>{upiQr ? <img src={upiQr} alt="Common PhonePe UPI payment QR code" width="240" height="240" style={{display:"block",margin:"16px auto",background:"#fff",padding:12,borderRadius:8}} /> : <p><strong>Payment QR is not configured yet.</strong> Add NEXT_PUBLIC_PHONEPE_UPI_ID in Vercel using your actual PhonePe UPI ID, then redeploy.</p>}<p>Enter the booking reference in the UPI payment note if your app allows it. Tickets are not issued automatically; the event admin will verify the received payment first.</p>
      <form onSubmit={submitPaymentEvidence} style={{display:"grid",gap:12,marginTop:18,textAlign:"left"}}>
        <h4 style={{margin:"8px 0"}}>Upload payment screenshot</h4>
        <label>UPI transaction ID / UTR *
          <input required minLength={6} maxLength={100} value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} placeholder="Enter transaction ID from PhonePe" />
        </label>
        <label>Payment screenshot * (JPG, PNG or WEBP; maximum 5 MB)
          <input required type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPaymentScreenshot(e.target.files?.[0] || null)} />
        </label>
        {paymentScreenshot && <p>Selected: {paymentScreenshot.name}</p>}
        <button className="pay-btn" disabled={uploadBusy} type="submit">{uploadBusy ? "UPLOADING…" : "SUBMIT PAYMENT EVIDENCE →"}</button>
        <p className="secure-note">Your screenshot is stored privately for admin review. A screenshot alone does not confirm payment.</p>
      </form>
      </div>}
    </form></section>
    <section className="rules-section"><div className="section-title"><span>✦</span> INSTRUCTIONS & RULES <span>✦</span></div><p className="section-subtitle">Follow the operator’s instructions to keep the ride safe for everyone.</p><div className="rules-grid">{rules.map((rule, i) => <div className="rule" key={rule}><b>{String(i + 1).padStart(2, "0")}</b><p>{rule}</p></div>)}</div></section>
    <section className="how"><div className="section-title"><span>✦</span> HOW IT WORKS <span>✦</span></div><div className="steps">{["Choose a package","Enter rider details","Pay securely","Show QR and ride"].map((s,i)=><div key={s}><b>{i+1}</b><h3>{s}</h3><p>{["Select the ride package that fits your group.","Add buyer contact details and each rider’s name and course.","Complete checkout and wait for payment verification.","Show each rider’s QR ticket to the event team."][i]}</p></div>)}</div></section>
    <footer><strong>AC AGNIRASA × BULL RIDE</strong><p>30 OCTOBER 2026 · UDYAMI BAZAAR · GD GOENKA UNIVERSITY</p><small>Safe & secure · Professional operator · Ride responsibly and follow all safety rules.</small><a href="#book">BOOK YOUR RIDE ↑</a></footer>
  </main>;
}