# Architecture diagrams

Source files for all architecture diagrams used in this project, in [Mermaid](https://mermaid.js.org/) syntax.

## Diagrams

| File | Scope | Used in |
|------|-------|---------|
| `01_vue-densemble-fonctionnelle.mmd` | High-level functional view, all zones and main flows | Dossier projet — Introduction |
| `02_vue-reseau-detaillee.mmd` | Detailed network view with IP plan and flows | Dossier projet — CCP1 Network |
| `03_defense-en-profondeur.mmd` | Defense-in-depth model, 6 security layers | Dossier projet — CCP3 PSSI |
| `04_chaine-devops-iac.mmd` | DevOps toolchain and IaC flow | Dossier projet — Best practices |
| `05_flux-observabilite.mmd` | Observability data flow, agents to dashboards | Dossier projet — Observability |

## Editing

1. Open the `.mmd` file in any editor.
2. Paste the content in [mermaid.live](https://mermaid.live) to preview.
3. Edit, copy back to the `.mmd` file.
4. Export rendered diagrams to `exports/` as `<number>_<name>.svg` and `.png`.

## Conventions

- No emojis in diagrams (better PDF rendering)
- French labels (target audience: jury AIS French)
- Pastel color palette tied to functional zones (consistent across diagrams)
- File numbering matches the order of appearance in the final dossier
