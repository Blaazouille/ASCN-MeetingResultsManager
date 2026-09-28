# Changelog

## [1.2.0](https://github.com/Blaazouille/ASCN-MeetingResultsManager/compare/v1.1.1...v1.2.0) (2026-09-28)


### Features

* redesign the interface (Tableau de bassin) ([#13](https://github.com/Blaazouille/ASCN-MeetingResultsManager/issues/13)) ([ca72502](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/ca72502cb1df65e3bc9187c7da92287a696f091c))

## [1.1.1](https://github.com/Blaazouille/ASCN-MeetingResultsManager/compare/v1.1.0...v1.1.1) (2026-09-28)


### Bug Fixes

* improve meeting routing, swimmer count and contrast ([#11](https://github.com/Blaazouille/ASCN-MeetingResultsManager/issues/11)) ([5ad2645](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/5ad26459d94a6d3e638695ff8ed5c5af7dc4f01f))

## [1.1.0](https://github.com/Blaazouille/ASCN-MeetingResultsManager/compare/v1.0.1...v1.1.0) (2026-09-27)


### Features

* display app version in window title and sidebar ([#9](https://github.com/Blaazouille/ASCN-MeetingResultsManager/issues/9)) ([917593a](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/917593acd1f636fe4baa2c6d50f07f3f0f6e13fc))

## [1.0.1](https://github.com/Blaazouille/ASCN-MeetingResultsManager/compare/v1.0.0...v1.0.1) (2026-09-27)


### Bug Fixes

* install to Program Files instead of AppData ([#7](https://github.com/Blaazouille/ASCN-MeetingResultsManager/issues/7)) ([1e506ab](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/1e506abd17b3e267867c1f71dfef45646cdcc8eb))

## 1.0.0 (2026-09-27)


### Features

* add A4Page print layout with print isolation CSS ([92c18e0](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/92c18e004b05361cc40d925699298b4fe5c8056c))
* add AppShell layout with sidebar navigation ([b181048](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/b181048c4d0e6182f284a9f11819329ad289b98e))
* add backup and restore (Phase 9) ([#3](https://github.com/Blaazouille/ASCN-MeetingResultsManager/issues/3)) ([d14858e](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/d14858ef14d96b79300f2ed0324ee9700c606185))
* add CategoryTabs component ([4bf7109](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/4bf71094f552705e0a5c58a75eb56cc184a62f4f))
* add club name search filter to ranking engine ([8fd4fb8](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/8fd4fb8354f407149625cb2d4730ae2b4065d50b))
* add Excel export for team ranking ([6ff951e](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/6ff951e17c979222952e2fd3454d0614f3acb2a3))
* add ImportPage using the shared import state ([7fe4fb6](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/7fe4fb606a045ffc4e414aa70238b2caf9368cdd))
* add meeting history screen (create/list meetings) ([c280d8d](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/c280d8d06ba4bcec8f41be3d1028b97737f90aa2))
* add minSwimmers threshold and active-category resolution to ranking engine ([f42c375](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/f42c375808c42f9294d9d75edbc6bb75f8bd7b3f))
* add PDF export for team ranking ([93dc0a3](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/93dc0a321a8f2a4aed4c2cf6d7133f3f301a89f7))
* add placeholder pages for Home, Print, and Settings ([b74cdb0](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/b74cdb0d696fa5a9cbcd04ae19367a5249265861))
* add print meta and category slug utilities ([f60a823](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/f60a823dba1bf9cc7f2e7741765b69ee348bb43a))
* add PrintPreview and PrintControls components ([eff5fb0](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/eff5fb0f0c7d02de31b6de6d2f0dbcd5e5c47871))
* add RankingPage wiring category/topN/search to the table ([7f6e3a9](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/7f6e3a941d976090680538e17d41e16cfd603a97))
* add RankingToolbar with Top N selector and status badge ([95a8d9e](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/95a8d9eff90d0325b2f69f39af72224119eeafad))
* add SQLite schema and meeting CRUD ([a174f80](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/a174f800b1229e96f279e20b703d654f23e36894))
* add SwimmerDetail sub-table component ([9044e49](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/9044e4938648ac56058a8d4180504d5c51b4e32e))
* add TeamRankingTable with search and expandable rows ([498f3f9](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/498f3f9c611907d1981cd9d2d2f6a87ec676f2c5))
* add TeamRow component with expandable swimmer detail ([ff3c611](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/ff3c611e477a84e601d9419a48bc833b820ae0d6))
* add useMeeting hook and wire it into AppShell context ([095db54](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/095db54a43be4bd259928832b5935083f7b94c31))
* add useRanking hook for category/topN selection ([efeae01](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/efeae0172e816a338759b4e049150bc1e29000fc))
* add versioning, installer, and in-app auto-update ([#5](https://github.com/Blaazouille/ASCN-MeetingResultsManager/issues/5)) ([27ecff4](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/27ecff42272cc3f7df0fbff31c7e61f300d6ff23))
* build the Paramètres screen for meeting info and ranking rules ([8e9dda4](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/8e9dda459e54930c90a79b1ad50c57fc6f47b145))
* configure electron-builder packaging for Windows/macOS ([97679af](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/97679af164ce019c7d6fd59b8647d9440009cae0))
* expose updateMeeting from useMeeting ([5d7a36c](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/5d7a36c2d6ff5ee8652c1700aebd7495ff6f91bf))
* extract useImport hook from App.tsx ([9b61377](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/9b613773f1fdf410ebbc2f4c746c84a06650e442))
* persist default top N, min swimmers, active categories on meeting ([86a9bcc](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/86a9bcc802670bc6d879b4ac9e9d76d2b8e31af3))
* persist imported swimmer results to the current meeting ([08341ab](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/08341abd7e8f698cb8d984d0cc30e9b9212c1615))
* persist swimmer results and team rankings ([afbfdb5](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/afbfdb5196abe58d67088a487ec3bc0499fa6990))
* Phase 1 scaffold, CSV parser, ranking engine, and DropZone ([7b2e351](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/7b2e35171d4716cb035262a317a22ba9efdaa67b))
* reload ranking from persisted swimmer results when reopening a meeting ([b060239](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/b060239f3d96484d523b28032b83eda27a300a4c))
* show both the file's and the meeting's stats on Import ([29b38e2](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/29b38e2b1d0470c23cfea4d1d281cd05697c949e))
* show the actual warning text on the Import screen ([7fe73cc](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/7fe73cc4c48baffe1831b5ee108321df6a9c46a9))
* sidebar group nav + category tabs unifiés + alignement exports ([#1](https://github.com/Blaazouille/ASCN-MeetingResultsManager/issues/1)) ([9fd76b8](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/9fd76b85726b7ec2b19978a2975a06abd4e0103c))
* translate CSV warnings to French and tighten duplicate check ([a744f1d](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/a744f1d4badbda2759c874731dbb80c531878856))
* wire AppShell routing into App.tsx ([dfeeb98](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/dfeeb984c72778ca4cc43d56b308623646234f1c))
* wire Impression screen with print preview and PDF export ([d6cd439](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/d6cd43988f88b5bf9fa29bb813d1af2fbc11ca22))
* wire IPC handlers to SQLite persistence ([c0cdc8b](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/c0cdc8b5654f213b74d0912b1f8ace18f4e217d9))
* wire print and export actions into the ranking toolbar ([f035264](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/f035264dc7bccf6e297c67dc9508ef0290b3a123))


### Bug Fixes

* address /code-review findings ([f6f02c3](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/f6f02c3daf122972303d0908dee1456b4fc227a1))
* address /code-review findings (swimmerCount bug, memo, types, key) ([4c60540](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/4c60540b41aa342708984455cbe9faf77c97d6ef))
* address final review findings (key collision, ASCN constant, empty-state message) ([0fccd05](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/0fccd05492a1befac96c74e8373d1a9e28ab694d))
* address re-review findings from the final-review fix wave ([e6d77c7](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/e6d77c7bfeda5d4bba23995814794c2ede5a56be))
* apply meeting ranking rules to PrintPage ([40f49de](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/40f49de2ee34fb0cd06c580e79a0e8aebd23f391))
* bump better-sqlite3 to 13.0.3 for Node 24 prebuilt binary support ([ed06fdf](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/ed06fdfe240c4e61f879cb671d2179ab9a8a9218))
* Classement/Impression always read from SQLite, not the in-memory parse ([d3093e0](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/d3093e04e005885ab3baa673e93d34fd3ec2a6f0))
* clear stale save confirmation when settings form becomes dirty ([cb2a6ef](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/cb2a6ef3e1317daa2042e1be5cef1c75dcce75c2))
* count distinct swimmers, not file rows, in the import summary ([e7ce1ca](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/e7ce1ca34d5ec4cedd996604a03c88d53e9a26f9))
* derive ranking status badge and initial rules from the meeting record ([ba49deb](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/ba49deb21cb15ae372afeae97222b78e0ca0c4fa))
* keep better-sqlite3 external in the electron main bundle ([5df951c](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/5df951c0f95087da4506914baa1df8e134fe6fb9))
* remove vite-plugin-electron-renderer breaking the Electron renderer ([55d6598](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/55d6598be9a69e45297bc986c00caf566cb67dd0))
* repair historique render-timing bugs and cross-meeting import leakage ([3495546](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/34955461119f72e73116ba3ae2868fe01c35b977))
* resolve print/export issues from Phase 3 final review ([8000e02](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/8000e02bb68e452cbff94be3a18d217c313d4c71))
* resolve TypeScript strict mode error in excel-export test ([c5ad64e](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/c5ad64e73aad22c694311ee18073a565b4a988b2))
* resync top N on meeting switch, prevent deselecting all categories ([fa73def](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/fa73deff5baf858d876ad019a96c5e9c8988d11e))
* surface createMeeting errors and harden Electron startup ([fcdbd3e](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/fcdbd3e86a06d3f87f32a084631a8607752a822e))
* tighten swimmer UNIQUE constraint, add schema version, round-trip test ([a55b231](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/a55b231d526c1cdbf90986526eeafaf907209fd8))
* use dateStyle medium for CLAUDE.md convention (16 nov. 2026 format) and add format validation test ([e5f62de](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/e5f62dee0458edce26ecdaa0fe8ff5aab8cbe519))
* use swimmer.rank as table key for uniqueness guarantee ([c365c65](https://github.com/Blaazouille/ASCN-MeetingResultsManager/commit/c365c65a27030dedf68b6f8c76ebc5cfff523797))
