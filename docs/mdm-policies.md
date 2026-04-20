# MDM Policies — Deliphone

Three MDM policies manage device lifecycle through Google Android Management API.

## Policy: `kiosk`

**Applied when:** Device is in inventory (not rented)

Restrictions:
- Device locked to Deliphone kiosk app only
- No app installations allowed
- Wi-Fi only (no cellular data consumption)
- Camera disabled
- Factory reset protection enabled

Purpose: Prevents unauthorized use while device is at partner location or in transit.

## Policy: `active_rental`

**Applied when:** Device is rented to a client (rental status: active)

Restrictions:
- All standard apps available
- Google Play access enabled
- Deliphone app cannot be uninstalled (system app)
- Location services must remain on
- Factory reset protection enabled (requires Deliphone admin credentials)
- MDM agent cannot be disabled

Purpose: Client has full use of the device while maintaining platform control and anti-theft protection.

## Policy: `lost_or_stolen`

**Applied when:** Device is reported lost/stolen or debt exceeds 4500 RUB threshold

Restrictions:
- Device locked immediately (lock screen with contact info)
- All apps inaccessible
- Location reporting interval increased to every 5 minutes
- Loud alarm sound can be triggered remotely
- Camera disabled
- USB debugging disabled

Purpose: Protect device and incentivize return. Admin can remotely wipe if unrecoverable.

## Lifecycle Diagram

```
[New Device] → enroll → [kiosk]
                            ↓
                     issue to client
                            ↓
                     [active_rental]
                            ↓
              ┌─────────────┼──────────────┐
              ↓             ↓              ↓
         [returned]    [debt > 4500]   [lost report]
              ↓             ↓              ↓
          [kiosk]    [lost_or_stolen]  [lost_or_stolen]
                            ↓              ↓
                      [recovered?]    [recovered?]
                            ↓              ↓
                        [kiosk]        [kiosk]
```

## Admin Actions

From the admin panel (Devices → MDM tab):

| Action | Effect | Requires Confirmation |
|--------|--------|-----------------------|
| Lock | Immediate screen lock | Yes |
| Reboot | Remote reboot | Yes |
| Reset Password | Clear device PIN/password | Yes |
| Wipe | Factory reset, all data erased | Yes (double confirm) |
| Enroll | Generate enrollment QR | No |
