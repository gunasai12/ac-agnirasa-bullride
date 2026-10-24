"use client";

import { FormEvent, useState } from "react";

const packages = {
  single: { name: "Single Ride", price: 150, riders: 1, line: "One rider. One big story." },
  duo: { name: "Duo Ride", price: 280, riders: 2, line: "Ride with a friend." },
  triple: { name: "Triple Thrill", price: 420, riders: 3, line: "More riders, more memories." },
  five: { name: "Fearless Five", price: 650, riders: 5, line: "The ultimate group deal." },
} as const;
type PackageKey = keyof typeof packages;
type Rider = { name: string; course: string };
declare global { interface Window { Razorpay?: new (opts: any) => { open: () => void } } }

export default function Home() {
  const [chosen, setChosen] = useState<PackageKey>("duo");
  const [buyerName, setBuyerName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [riders, setRiders] = useState<Rider[]>([{ name: "", course: "" }, { name: "", course: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function selectPackage(key: PackageKey) {
    setChosen(key);
    setRiders(old => Array.from({ length: packages[key].riders }, (_, i) => old[i] || { name: "", course: "" }));
    setError(""); setNotice("");
  }
  function updateRider(i: number, field: keyof Rider, value: string) {
    setRiders(old => old.map((r, j) => i === j ? { ...r, [field]: value } : r));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/create-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ buyerName, email, mobile, riders, package: chosen }) });
      const order = await response.json();
      if (!response.ok) throw new Error(order.error || "Could not start checkout.");
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        if (!window.Razorpay) { setError("Payment checkout could not load."); setBusy(false); return; }
        new window.Razorpay({
          key: order.keyId, amount: order.amount, currency: order.currency, order_id: order.orderId,
          name: "AC Agnirasa Bull Ride", description: packages[chosen].name,
          prefill: { name: buyerName, email, contact: mobile }, notes: { bookingId: order.bookingId },
          theme: { color: "#ffd21a" },
          handler: async (payment: any) => {
            try {
              const verified = await fetch("/api/verify-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payment, bookingId: order.bookingId }) });
              const result = await verified.json();
              if (!verified.ok) throw new Error(result.error || "Payment verification failed.");
              setNotice("Payment verified. Your booking confirmation and QR tickets will be emailed.");
            } catch (e) { setError(e instanceof Error ? e.message : "Payment verification failed."); }
            finally { setBusy(false); }
          },
          modal: { ondismiss: () => setBusy(false) }
        }).open();
      };
      script.onerror = () => { setError("Could not load Razorpay checkout."); setBusy(false); };
      document.body.appendChild(script);
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); setBusy(false); }
  }

  return <main>
    <nav className="nav"><a className="brand" href="#"><small>AC AGNIRASA PRESENTS</small><b>BULL <span>RIDE</span></b></a><a className="nav-cta" href="#book">BUY TICKETS ↗</a></nav>
    <section className="hero"><div className="hero-copy"><p className="eyebrow">UDYAMI BAZAAR · GD GOENKA UNIVERSITY</p><h1>DARE. RIDE.<br/><span>DOMINATE.</span></h1><p>Can you stay on? Get your crew together and take on the bull.</p><div className="event-meta">30 OCTOBER 2026 <span>⚡ 8 HOURS OF NON-STOP FUN</span></div><a className="primary-btn" href="#book">BOOK YOUR RIDE →</a></div><div className="stamp">WILL YOU<br/>STAY ON?</div></section>
    <section className="packages" id="tickets"><div className="section-title">✦ COMBO OFFERS ✦</div><div className="ticket-grid">
      {(Object.keys(packages) as PackageKey[]).map(key => <article className={"ticket-card " + (chosen === key ? "selected" : "")} key={key}><p className="ticket-label">{packages[key].name}</p><p className="ticket-price">₹{packages[key].price}</p><p className="ticket-desc">{packages[key].riders} rider{packages[key].riders === 1 ? "" : "s"} · {packages[key].line}</p><button type="button" className="card-link" onClick={() => selectPackage(key)}>SELECT PACKAGE →</button></article>)}
    </div></section>
    <section className="booking-section" id="book"><div className="booking-intro"><p className="eyebrow">YOUR NEXT STORY STARTS HERE</p><h2>BOOK YOUR<br/><span>{packages[chosen].name.toUpperCase()}</span></h2><p>{packages[chosen].line}</p><p>✓ {packages[chosen].riders} individual QR ticket{packages[chosen].riders === 1 ? "" : "s"}<br/>✓ Email confirmation<br/>✓ Secure checkout after payment verification</p><div className="price-box"><small>TOTAL PACKAGE PRICE</small><strong>₹{packages[chosen].price}</strong><span>{packages[chosen].riders} RIDER{packages[chosen].riders === 1 ? "" : "S"}</span></div></div>
    <form className="booking-form" onSubmit={submit}><h3>01 — Booking details</h3><p className="muted">Who should receive the tickets?</p>
      <label>Buyer full name *<input required minLength={2} maxLength={100} autoComplete="name" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Enter your full name"/></label>
      <div className="form-row"><label>Email address *<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value.trim())} placeholder="you@example.com"/></label><label>Mobile number *<input required type="tel" pattern="[+]?[0-9 ()-]{8,18}" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="+91 98765 43210"/></label></div>
      <h3 className="rider-heading">02 — Rider details</h3><p className="muted">Enter details for all {packages[chosen].riders} riders.</p>
      {riders.map((r, i) => <div className="rider-card" key={i}><strong>RIDER {String(i + 1).padStart(2, "0")}</strong><label>Rider full name *<input required minLength={2} maxLength={100} value={r.name} onChange={e => updateRider(i, "name", e.target.value)} placeholder={"Rider " + (i + 1) + " full name"}/></label><label>Course / department *<input required minLength={2} maxLength={100} value={r.course} onChange={e => updateRider(i, "course", e.target.value)} placeholder="e.g. B.Tech CSE"/></label></div>)}
      <label className="consent"><input type="checkbox" required/> I confirm these details are correct and agree to follow the event rules and safety instructions.</label>
      {error && <p className="message error" role="alert">{error}</p>}{notice && <p className="message success" role="status">{notice}</p>}
      <button className="pay-btn" disabled={busy} type="submit">{busy ? "PREPARING CHECKOUT…" : "PAY ₹" + packages[chosen].price + " & GET TICKETS →"}</button><p className="secure-note">Secure checkout · QR tickets issued after payment verification</p>
    </form></section>
    <section className="how"><div className="section-title">✦ HOW IT WORKS ✦</div><div className="steps">{["Choose a package","Enter details","Pay securely","Scan and ride"].map((s,i)=><div key={s}><b>{i+1}</b><h3>{s}</h3><p>{["Select the ride package that fits your group.","Add buyer and rider details.","Complete checkout and wait for payment verification.","Show each rider’s QR ticket at the event."][i]}</p></div>)}</div></section>
    <footer><strong>AC AGNIRASA × BULL RIDE</strong><p>30 OCTOBER 2026 · GD GOENKA UNIVERSITY · UDYAMI BAZAAR</p><small>Ride responsibly. Follow operator instructions and all safety rules.</small></footer>
  </main>;
}
