"use client";

import { useState } from "react";

type Booking = { id: string; buyer_name: string; email: string; mobile: string; package_name: string; rider_count: number; amount_paise: number; created_at: string; riders: { name: string; course: string }[] };

export default function AdminPaymentsPage() {
  const [token, setToken] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [references, setReferences] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadQueue() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/manual-payments", { headers: { "x-admin-token": token }, cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load queue.");
      setBookings(result.bookings || []);
      setMessage("Loaded " + (result.bookings || []).length + " pending booking(s).");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Request failed."); }
    finally { setBusy(false); }
  }

  async function cancel(bookingId: string) {
    if (!window.confirm("Cancel this booking only after checking that no payment was received? This releases its reserved ticket capacity.")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/manual-payments", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-token": token }, body: JSON.stringify({ bookingId, action: "cancel" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not cancel booking.");
      setMessage(result.message);
      await loadQueue();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Request failed."); }
    finally { setBusy(false); }
  }

  async function verify(bookingId: string) {
    const paymentReference = (references[bookingId] || "").trim();
    if (paymentReference.length < 6) { setMessage("Enter the transaction reference/UTR after checking the actual credit in PhonePe/bank history."); return; }
    if (!window.confirm("Confirm you have independently checked the actual received payment and the exact amount in PhonePe/bank history? This will mark the booking paid and attempt to email tickets.")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/manual-payments", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-token": token }, body: JSON.stringify({ bookingId, paymentReference }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not verify booking.");
      setMessage(result.message + (result.excelSynced ? "" : " Excel sync failed; check Power Automate."));
      await loadQueue();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Request failed."); }
    finally { setBusy(false); }
  }

  return <main style={{maxWidth:1000,margin:"40px auto",padding:20,fontFamily:"Arial,sans-serif",color:"#171717"}}>
    <h1>AC Agnirasa Bull Ride — Payment Review</h1>
    <p>Private admin page. Check PhonePe/bank transaction history yourself before approving. Never approve from a screenshot alone.</p>
    <label style={{display:"block",margin:"18px 0"}}>Admin review token
      <input type="password" value={token} onChange={e=>setToken(e.target.value)} autoComplete="current-password" style={{display:"block",width:"100%",maxWidth:480,padding:12,marginTop:6}} />
    </label>
    <button disabled={busy || !token} onClick={loadQueue} style={{padding:"12px 18px",cursor:"pointer"}}>{busy ? "Please wait…" : "Load pending bookings"}</button>
    {message && <p role="status" style={{padding:12,background:"#fff7d6",borderRadius:8}}>{message}</p>}
    <section style={{display:"grid",gap:16,marginTop:24}}>
      {bookings.map(b => <article key={b.id} style={{border:"1px solid #ddd",borderRadius:12,padding:18}}>
        <h2 style={{fontSize:18,marginTop:0}}>{b.package_name} — ₹{(b.amount_paise/100).toFixed(0)}</h2>
        <p><strong>Booking:</strong> {b.id}</p>
        <p><strong>Buyer:</strong> {b.buyer_name} · {b.mobile} · {b.email}</p>
        <p><strong>Created:</strong> {new Date(b.created_at).toLocaleString()}</p>
        <p><strong>Riders:</strong> {b.riders.map(r=>r.name+" ("+r.course+")").join(", ")}</p>
        <label style={{display:"block",margin:"12px 0"}}>PhonePe transaction ID / UTR
          <input value={references[b.id] || ""} onChange={e=>setReferences(old=>({...old,[b.id]:e.target.value}))} placeholder="Enter transaction reference after checking actual credit" style={{display:"block",width:"100%",maxWidth:520,padding:10,marginTop:6}} />
        </label>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button disabled={busy} onClick={()=>verify(b.id)} style={{padding:"12px 18px",background:"#151515",color:"#fff",border:0,borderRadius:6,cursor:"pointer"}}>Verify payment & issue tickets</button><button disabled={busy} onClick={()=>cancel(b.id)} style={{padding:"12px 18px",background:"#fff",color:"#8b1a1a",border:"1px solid #8b1a1a",borderRadius:6,cursor:"pointer"}}>Cancel unpaid booking</button></div>
      </article>)}
    </section>
    {bookings.length===0 && <p>No bookings displayed. Load the queue to check pending bookings.</p>}
  </main>;
}
