---
name: Club Customization Paywall
description: Editing club name, stadium name and shield is gated behind R$10 unlock; admin grants via edge function
type: feature
---
- Field: `clubProfile.customizationUnlocked` (boolean, default false) inside `game_saves.club_data`
- ClubProfileTab now contains the Identity section (shield + name + stadium); ClubSettingsTab is deprecated and the `clubsettings` deep-link redirects to ClubProfileTab
- "Identidade & Escudo" was removed from GameMenu — only "Perfil do Clube" remains
- Locked state shows R$10 upsell card with Pix instructions (`flm26@pix.com`)
- Admin unlocks via AdminTab > Users tab "Liberar Personalização" card → calls edge function `admin-grant-customization` (validates admin role, updates JSONB, logs to `admin_logs`)
