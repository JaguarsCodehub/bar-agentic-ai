# How to Use BarPulse: A Bar Manager's Guide

Welcome to BarPulse! If you've never managed a bar before, the flow of inventory, sales, and loss detection might seem complicated. This guide breaks down exactly **how a bar operates in the real world** and **how BarPulse digitizes that workflow** to save thousands of dollars a month in lost revenue.

---

## 🥃 1. The Real-World Bar Problem

Bars operate on incredibly thin margins. The biggest hidden cost in a bar is **liquid loss** (shrinkage). This happens via:
1. **Theft:** A bartender giving free drinks to friends or pocketing cash.
2. **Over-pouring:** Poking an extra 10ml into every drink. Across 300 drinks a night, that's 4 bottles of expensive liquor gone.
3. **Wastage/Breakage:** Dropping a bottle, spilling, or drinks sent back by customers.
4. **Entry Errors:** Forgetting to log a sale in the POS (Point of Sale) system.

**The Solution:** You must know exactly how much alcohol was handed to the bartender at the start of their shift, how much they sold, and how much they handed back at the end. The math is simple:
`Opening Stock + Stock Added During Shift - Sales = Expected Closing Stock`

If the Actual Closing Stock is fundamentally lower than the Expected Closing Stock, **you are losing money.**

---

## 🛠️ 2. The Daily BarPulse Workflow

Here is exactly how you (the owner/manager) should use this application day-to-day.

### Phase 1: The Initial Setup (Do this once)
1. **Sign Up:** Create your Bar account. This makes you the "Owner".
2. **Add Products:** Add the bottles you stock. (e.g., Bacardi Superior, Makazai White Rum, Old Monk). 
   - **Cost Price**: What you pay the supplier (e.g., ₹700).
   - **Sale Price**: What the customer pays for the whole bottle or equivalent volume (e.g., ₹1899).
3. **Add Suppliers:** Add the details of the distributors who deliver your alcohol.

### Phase 2: Restocking (When the delivery truck arrives)
When your bar runs low on inventory, you order more from suppliers.
1. **Purchase Orders (PO):** Go to Purchase Orders and create a new order (e.g., ordering 10 cases of Bacardi).
2. **Receiving Stock:** When the delivery truck arrives at the backdoor, you verify the boxes. In BarPulse, click **"Receive"** on the PO. 
   - *BarPulse Magic:* This automatically calculates the items and instantly updates your **Stock Movements** (as `IN`) and increases the `current_stock` of those products.

### Phase 3: The Daily Shift (This happens every day)

#### A. Opening the Shift (e.g., 4:00 PM)
Before the bar opens, the manager or head bartender counts the physical bottles behind the bar.
* **In BarPulse:** Go to **Shifts** -> **Open Shift**. Enter the physical count of bottles you see (e.g., 30 bottles of Bacardi).

#### B. During the Shift (4:00 PM to 2:00 AM)
Customers buy drinks. Bartenders pour drinks.
* **In BarPulse:** Your POS (Square, Toast) records sales. For now, you log these in the **Sales** tab. If a customer buys 2 bottles of Bacardi, log it as a sale of `2`.
* *Got an emergency delivery mid-shift?* Go to **Stock Movements** and log an `IN`.
* *Bartender dropped a bottle?* Go to **Stock Movements** and log an `OUT` with the reason `Breakage`.

#### C. Closing the Shift (e.g., 2:30 AM)
The music stops. The doors lock. The closing bartender *must* count the bottles left behind the bar.
* **In BarPulse:** Go to **Shifts**, find your open shift, and click **Close Shift**. Enter the final bottle counts. 
* *BarPulse Magic:* The moment you hit close, BarPulse runs the **Reconciliation Engine**.

### Phase 4: The Next Morning Analysis (Manager/Owner)
You wake up, log into BarPulse, and look at the **Dashboard** and **Loss Reports**.

* BarPulse did the math overnight: `Opened with 30 Bacardi` - `Sold 2` = `Expected 28`.
* But the bartender typed in that they closed with `25`.
* **Discrepancy:** 3 bottles missing!
* BarPulse flags this as a **CRITICAL LOSS REPORT** because the loss value is high.

1. **Investigate:** You ask the bartender what happened to the 3 missing bottles of Bacardi.
2. **Resolve:** Maybe they admit they dropped a case and forgot to log it. You go to **Loss Reports**, click **Resolve**, select `Wastage` or `Entry Error`, and type the notes. Or, if you suspect theft, you select `Theft` and review the security cameras.

---

## 📈 3. Why This Dashboard is Powerful

The typical bar owner does inventory maybe once a week or once a month using a messy clipboard and Excel spreadsheet. By the time they realize 10 bottles of expensive Tequila are missing, 3 weeks have passed, and they have no idea which bartender was working when it happened.

**BarPulse forces per-shift accountability.** If stock goes missing, you know exactly which 8-hour window it happened in, precisely how much revenue you lost, and exactly which staff members were on the clock. You stop the bleeding instantly.
