# Flow: Device Issuance ("Magic Issuance")

Step-by-step flow for issuing a device to a client at a partner location.

## Prerequisites

- Client has the Deliphone app installed and is registered (SMS auth)
- Partner is logged into the partner cabinet
- Device is in inventory at the partner's location (status: available)

## Flow Steps

### 1. Client Selection (~30 sec)

Partner searches for client by phone number in the issue wizard.
Client must already be registered in the system.

### 2. Device Selection (~15 sec)

Partner scans QR code on the device or enters IMEI manually.
System verifies device is available and at this location.

### 3. Device Photography (~60 sec)

Partner takes 3 photos of the device:
- Front panel (screen)
- Back panel
- Screen (powered on)

Photos are uploaded and stored as issuance condition evidence.

### 4. Client Signature (~20 sec)

Client signs on the partner's tablet/screen.
Signature confirms acceptance of the device in documented condition.

### 5. Payment QR Generation + Payment (~45 sec)

System generates a payment QR code.
Partner shows QR to client.
Client scans with phone camera, which opens the activation/payment page.
Client pays deposit (2500 RUB) + first day rental via YooKassa.
Partner screen polls for payment status every 3 seconds.

### 6. Activation Complete (~5 sec)

Once payment is confirmed:
- Rental record is created (status: active)
- Device status changes to "rented"
- Device custody changes to "client"
- MDM policy switches from "kiosk" to "active_rental"
- Client sees success screen
- Partner sees completion screen

## Total Time Estimate: ~3 minutes

## Error Handling

- Payment timeout (5 min) → QR expires, partner can regenerate
- Payment failure → client retries, no state change
- Device not found → partner enters IMEI manually
- Client not found → client must register first on their phone

## Post-Issuance

- Daily charge begins next calendar day (midnight MSK)
- Client can use device normally under "active_rental" MDM policy
- Deposit is held as YooKassa authorization (up to 180 days)
