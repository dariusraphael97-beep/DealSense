# DealSense — Platform Pivot Design Doc
**Date:** 2026-05-07  
**Status:** Approved for implementation

---

## What We're Building

DealSense evolves from a car deal scoring tool into a **trusted peer-to-peer transaction platform for high-value private sales**. Starting with vehicles, expanding to luxury goods.

The name, LLC, domain, and tech stack all carry forward unchanged.

---

## The Problem

Two strangers need to exchange significant money for a valuable item privately. Facebook Marketplace and Craigslist leave both sides completely exposed — scams, fake payments, cash in parking lots, no verification, no documentation, no recourse. Millions of private transactions happen this way every year and nobody has built a safe, simple layer that protects both sides.

---

## How It Works

**Seller flow:**
1. Creates a listing with photos, title, description, price, category
2. Verifies identity via Stripe Identity ($1.50 per check, automated)
3. For vehicles: enters VIN, NHTSA free API auto-fills all car details
4. Listing goes live with a Verified Seller badge
5. Interested buyers contact seller through in-platform messaging only
6. When deal is agreed, buyer deposits funds into escrow
7. Seller hands over item with confidence — money is secured
8. Transaction completes, funds released to seller
9. For vehicles: DealSense walks both parties through title transfer step by step

**Buyer flow:**
1. Browses verified listings
2. Contacts seller through platform
3. Deposits funds into escrow — protected until item is confirmed
4. Receives item, confirms everything matches description
5. Funds released, transaction recorded
6. Dispute process available if something is wrong

---

## What Makes It Different

No existing platform combines all three for private sales:
- **Identity verification** of both parties
- **Escrow payment protection** for both parties
- **Documentation and title guidance** for vehicles

Facebook Marketplace has none. Craigslist has none. eBay has partial buyer protection but not for high-value private party peer-to-peer transactions in this way.

---

## MVP Scope — What's In

- Listing creation (photos, description, price, category)
- VIN entry for vehicles → NHTSA free API auto-fills details
- Seller identity verification via Stripe Identity
- Buyer identity verification via Stripe Identity
- Verified badge on listings
- In-platform messaging (buyer ↔ seller)
- Offer system (buyer makes offer, seller accepts/declines)
- Stripe Connect escrow — funds held until both parties confirm
- Transaction completion flow
- Step-by-step title transfer guidance by state (vehicles)
- Auto-generated bill of sale
- Transaction record for both parties
- Basic dispute process (manual review to start)

## MVP Scope — What's NOT In

- ClearVin vehicle history reports (add later as premium feature)
- MarketCheck pricing data (not needed for core product)
- Deal scoring / negotiation scripts (old product, not core here)
- Mobile app (web app only for MVP)
- Automated dispute resolution (manual first)
- Multiple cities / categories at launch (one city, vehicles first)

---

## Categories

**Launch category:** Vehicles (cars, motorcycles, boats, RVs)  
**Expansion categories:** Luxury watches, jewelry, high-end electronics, designer goods, musical instruments, sports equipment

---

## Revenue Model

Flat fee per completed transaction:
- Vehicles: $75 per transaction
- Luxury goods: $15–25 per transaction

**Projections:**
- 20 vehicle transactions/month = $1,500
- 50 transactions/month = $3,750
- 100 transactions/month = $7,500

Revenue begins when first transactions complete. No subscriptions, no credits, no ongoing fees for users.

---

## Tech Stack

All existing infrastructure carries forward:

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14 App Router |
| Database | Supabase |
| Auth | Supabase Auth |
| Payments | Stripe + Stripe Connect |
| Identity verification | Stripe Identity |
| VIN decode | NHTSA free API |
| Hosting | Vercel |
| Domain | dealsense.space |

No new expensive APIs. No third-party data dependencies for core functionality.

---

## Launch Strategy

1. Launch in **one category** (vehicles) and **one market** (New Jersey) first
2. Do first 20 transactions manually — be personally involved in every one
3. Make them perfect, build word of mouth
4. Expand to additional categories and cities once the model is proven

---

## Marketing — Zero Ad Budget

Target users already exist in communities discussing this exact problem:

- Reddit: r/hardwareswap, r/watchexchange, r/motorcycles, r/askcarsales, r/carav
- Facebook: local buy/sell groups in NJ
- Car enthusiast forums and Discord communities
- Content: "How to sell your car privately without getting scammed" — performs well on Google, YouTube, TikTok organically

---

## Budget Constraints

**Zero budget available.** All decisions must reflect this:

- All building done with Claude Code — no hired developers
- Brand identity with Sumon is paused — revisit when first revenue comes in
- All services must use free tiers until transactions generate income
- Stripe Identity ($1.50/check) is the only real variable cost — absorbed from transaction fees, not paid upfront
- No paid advertising or marketing spend

**Free tier limits to watch:**
- Supabase free: 500MB storage, 50,000 MAU — sufficient for MVP
- Vercel free: 100GB bandwidth, serverless functions — sufficient for MVP
- Stripe: No monthly fee, 2.9% + $0.30 per transaction + Stripe Connect fee

---

## What Carries Forward From Old DealSense

- DealSense LLC (Gina Santangelo, Member)
- dealsense.space domain
- Next.js / Supabase / Stripe setup
- Terms of Service and Privacy Policy (need updates for new model)
- NMVTIS compliance work
- Brand identity paused (Sumon Yousuf conversation on hold until revenue)

---

## What Doesn't Carry Forward

- ClearVin as a dependency (may add as optional premium feature later)
- Credit-based pricing model
- Deal scoring as the primary product
- Negotiation scripts

---

## The Vision

What Airbnb did for staying in strangers' homes.  
What Uber did for getting in strangers' cars.  
DealSense does for buying and selling anything valuable privately.

Starting in New Jersey. Expanding everywhere.

---

## Open Questions for Later

- When to add ClearVin as optional premium feature for vehicle listings
- Pricing adjustment once real transaction data is available
- Mobile app timeline
- State-specific title transfer handling complexity
