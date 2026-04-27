-- Padronização global dos nomes de ligas no sistema multiplayer (tier=nacional).
-- Atualiza ligas auto-criadas que ainda usam nomes genéricos como "BR Série A" para o nome real do país/divisão.

UPDATE public.multiplayer_leagues SET name = 'Brasileirão Série A'              WHERE auto_created AND tier = 'nacional' AND country = 'BR' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Brasileirão Série B'              WHERE auto_created AND tier = 'nacional' AND country = 'BR' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Brasileirão Série C'              WHERE auto_created AND tier = 'nacional' AND country = 'BR' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Brasileirão Série D'              WHERE auto_created AND tier = 'nacional' AND country = 'BR' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'La Liga'                          WHERE auto_created AND tier = 'nacional' AND country = 'ES' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'La Liga 2'                        WHERE auto_created AND tier = 'nacional' AND country = 'ES' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Primera Federación'               WHERE auto_created AND tier = 'nacional' AND country = 'ES' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Segunda Federación'               WHERE auto_created AND tier = 'nacional' AND country = 'ES' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Premier League'                   WHERE auto_created AND tier = 'nacional' AND country = 'EN' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'EFL Championship'                 WHERE auto_created AND tier = 'nacional' AND country = 'EN' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'EFL League One'                   WHERE auto_created AND tier = 'nacional' AND country = 'EN' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'EFL League Two'                   WHERE auto_created AND tier = 'nacional' AND country = 'EN' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Serie A'                          WHERE auto_created AND tier = 'nacional' AND country = 'IT' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Serie B'                          WHERE auto_created AND tier = 'nacional' AND country = 'IT' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Serie C'                          WHERE auto_created AND tier = 'nacional' AND country = 'IT' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Serie D'                          WHERE auto_created AND tier = 'nacional' AND country = 'IT' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Bundesliga'                       WHERE auto_created AND tier = 'nacional' AND country = 'DE' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = '2. Bundesliga'                    WHERE auto_created AND tier = 'nacional' AND country = 'DE' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = '3. Liga'                          WHERE auto_created AND tier = 'nacional' AND country = 'DE' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Regionalliga'                     WHERE auto_created AND tier = 'nacional' AND country = 'DE' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Ligue 1'                          WHERE auto_created AND tier = 'nacional' AND country = 'FR' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Ligue 2'                          WHERE auto_created AND tier = 'nacional' AND country = 'FR' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Championnat National'             WHERE auto_created AND tier = 'nacional' AND country = 'FR' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'National 2'                       WHERE auto_created AND tier = 'nacional' AND country = 'FR' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Primeira Liga'                    WHERE auto_created AND tier = 'nacional' AND country = 'PT' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Liga Portugal 2'                  WHERE auto_created AND tier = 'nacional' AND country = 'PT' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Liga 3'                           WHERE auto_created AND tier = 'nacional' AND country = 'PT' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Campeonato de Portugal'           WHERE auto_created AND tier = 'nacional' AND country = 'PT' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Eredivisie'                       WHERE auto_created AND tier = 'nacional' AND country = 'NL' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Eerste Divisie'                   WHERE auto_created AND tier = 'nacional' AND country = 'NL' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Tweede Divisie'                   WHERE auto_created AND tier = 'nacional' AND country = 'NL' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Derde Divisie'                    WHERE auto_created AND tier = 'nacional' AND country = 'NL' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Jupiler Pro League'               WHERE auto_created AND tier = 'nacional' AND country = 'BE' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Challenger Pro League'            WHERE auto_created AND tier = 'nacional' AND country = 'BE' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'National Division 1'              WHERE auto_created AND tier = 'nacional' AND country = 'BE' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Belgian Division 2'               WHERE auto_created AND tier = 'nacional' AND country = 'BE' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Süper Lig'                        WHERE auto_created AND tier = 'nacional' AND country = 'TR' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = '1. Lig'                           WHERE auto_created AND tier = 'nacional' AND country = 'TR' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = '2. Lig'                           WHERE auto_created AND tier = 'nacional' AND country = 'TR' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = '3. Lig'                           WHERE auto_created AND tier = 'nacional' AND country = 'TR' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Premiership'                      WHERE auto_created AND tier = 'nacional' AND country = 'SC' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Championship'                     WHERE auto_created AND tier = 'nacional' AND country = 'SC' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'League One'                       WHERE auto_created AND tier = 'nacional' AND country = 'SC' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'League Two'                       WHERE auto_created AND tier = 'nacional' AND country = 'SC' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Liga Profesional'                 WHERE auto_created AND tier = 'nacional' AND country = 'AR' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Primera Nacional'                 WHERE auto_created AND tier = 'nacional' AND country = 'AR' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Primera B Metropolitana'          WHERE auto_created AND tier = 'nacional' AND country = 'AR' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Primera C'                        WHERE auto_created AND tier = 'nacional' AND country = 'AR' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Primera División Uruguay'         WHERE auto_created AND tier = 'nacional' AND country = 'UY' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Segunda División Profesional'     WHERE auto_created AND tier = 'nacional' AND country = 'UY' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Segunda División Amateur'         WHERE auto_created AND tier = 'nacional' AND country = 'UY' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Tercera División Uruguay'         WHERE auto_created AND tier = 'nacional' AND country = 'UY' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'División de Honor'                WHERE auto_created AND tier = 'nacional' AND country = 'PY' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'División Intermedia'              WHERE auto_created AND tier = 'nacional' AND country = 'PY' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Primera División B'               WHERE auto_created AND tier = 'nacional' AND country = 'PY' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Primera División C'               WHERE auto_created AND tier = 'nacional' AND country = 'PY' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Primera División Chile'           WHERE auto_created AND tier = 'nacional' AND country = 'CL' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Primera B'                        WHERE auto_created AND tier = 'nacional' AND country = 'CL' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Segunda División Profesional CL'  WHERE auto_created AND tier = 'nacional' AND country = 'CL' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Tercera División A'               WHERE auto_created AND tier = 'nacional' AND country = 'CL' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Liga BetPlay'                     WHERE auto_created AND tier = 'nacional' AND country = 'CO' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Torneo BetPlay'                   WHERE auto_created AND tier = 'nacional' AND country = 'CO' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Primera C Colombia'               WHERE auto_created AND tier = 'nacional' AND country = 'CO' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Segunda C Colombia'               WHERE auto_created AND tier = 'nacional' AND country = 'CO' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Liga 1 Peru'                      WHERE auto_created AND tier = 'nacional' AND country = 'PE' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Liga 2 Peru'                      WHERE auto_created AND tier = 'nacional' AND country = 'PE' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Copa Perú'                        WHERE auto_created AND tier = 'nacional' AND country = 'PE' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Liga Distrital'                   WHERE auto_created AND tier = 'nacional' AND country = 'PE' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'LigaPro Serie A'                  WHERE auto_created AND tier = 'nacional' AND country = 'EC' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'LigaPro Serie B'                  WHERE auto_created AND tier = 'nacional' AND country = 'EC' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Segunda Categoría'                WHERE auto_created AND tier = 'nacional' AND country = 'EC' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Provincial Ecuador'               WHERE auto_created AND tier = 'nacional' AND country = 'EC' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'División Profesional Bolivia'     WHERE auto_created AND tier = 'nacional' AND country = 'BO' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Primera A Bolivia'                WHERE auto_created AND tier = 'nacional' AND country = 'BO' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Primera B Bolivia'                WHERE auto_created AND tier = 'nacional' AND country = 'BO' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Copa Simón Bolívar'               WHERE auto_created AND tier = 'nacional' AND country = 'BO' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Liga FUTVE'                       WHERE auto_created AND tier = 'nacional' AND country = 'VE' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Segunda División Venezuela'       WHERE auto_created AND tier = 'nacional' AND country = 'VE' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Tercera División Venezuela'       WHERE auto_created AND tier = 'nacional' AND country = 'VE' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Cuarta División Venezuela'        WHERE auto_created AND tier = 'nacional' AND country = 'VE' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'MLS'                              WHERE auto_created AND tier = 'nacional' AND country = 'US' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'USL Championship'                 WHERE auto_created AND tier = 'nacional' AND country = 'US' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'USL League One'                   WHERE auto_created AND tier = 'nacional' AND country = 'US' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'USL League Two'                   WHERE auto_created AND tier = 'nacional' AND country = 'US' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Liga MX'                          WHERE auto_created AND tier = 'nacional' AND country = 'MX' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Liga de Expansión MX'             WHERE auto_created AND tier = 'nacional' AND country = 'MX' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Liga Premier'                     WHERE auto_created AND tier = 'nacional' AND country = 'MX' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Liga TDP'                         WHERE auto_created AND tier = 'nacional' AND country = 'MX' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Canadian Premier League'          WHERE auto_created AND tier = 'nacional' AND country = 'CA' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'League1 Canada'                   WHERE auto_created AND tier = 'nacional' AND country = 'CA' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'PLSQ'                             WHERE auto_created AND tier = 'nacional' AND country = 'CA' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'BCSPL'                            WHERE auto_created AND tier = 'nacional' AND country = 'CA' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'J1 League'                        WHERE auto_created AND tier = 'nacional' AND country = 'JP' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'J2 League'                        WHERE auto_created AND tier = 'nacional' AND country = 'JP' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'J3 League'                        WHERE auto_created AND tier = 'nacional' AND country = 'JP' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'JFL'                              WHERE auto_created AND tier = 'nacional' AND country = 'JP' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'K League 1'                       WHERE auto_created AND tier = 'nacional' AND country = 'KR' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'K League 2'                       WHERE auto_created AND tier = 'nacional' AND country = 'KR' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'K3 League'                        WHERE auto_created AND tier = 'nacional' AND country = 'KR' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'K4 League'                        WHERE auto_created AND tier = 'nacional' AND country = 'KR' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Saudi Pro League'                 WHERE auto_created AND tier = 'nacional' AND country = 'SA' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Saudi First Division League'      WHERE auto_created AND tier = 'nacional' AND country = 'SA' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Saudi Second Division League'     WHERE auto_created AND tier = 'nacional' AND country = 'SA' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Saudi Third Division League'      WHERE auto_created AND tier = 'nacional' AND country = 'SA' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Chinese Super League'             WHERE auto_created AND tier = 'nacional' AND country = 'CN' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'China League One'                 WHERE auto_created AND tier = 'nacional' AND country = 'CN' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'China League Two'                 WHERE auto_created AND tier = 'nacional' AND country = 'CN' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'China Champions League'           WHERE auto_created AND tier = 'nacional' AND country = 'CN' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'A-League Men'                     WHERE auto_created AND tier = 'nacional' AND country = 'AU' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'NPL Australia'                    WHERE auto_created AND tier = 'nacional' AND country = 'AU' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'NPL State League 1'               WHERE auto_created AND tier = 'nacional' AND country = 'AU' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'NPL State League 2'               WHERE auto_created AND tier = 'nacional' AND country = 'AU' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Premier Soccer League'            WHERE auto_created AND tier = 'nacional' AND country = 'ZA' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'National First Division'          WHERE auto_created AND tier = 'nacional' AND country = 'ZA' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'ABC Motsepe League'               WHERE auto_created AND tier = 'nacional' AND country = 'ZA' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'SAFA Regional League'             WHERE auto_created AND tier = 'nacional' AND country = 'ZA' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Egyptian Premier League'          WHERE auto_created AND tier = 'nacional' AND country = 'EG' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Egyptian Second Division A'       WHERE auto_created AND tier = 'nacional' AND country = 'EG' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Egyptian Second Division B'       WHERE auto_created AND tier = 'nacional' AND country = 'EG' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Egyptian Third Division'          WHERE auto_created AND tier = 'nacional' AND country = 'EG' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Nigeria Premier Football League'  WHERE auto_created AND tier = 'nacional' AND country = 'NG' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Nigeria National League'          WHERE auto_created AND tier = 'nacional' AND country = 'NG' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Nigeria Nationwide League One'    WHERE auto_created AND tier = 'nacional' AND country = 'NG' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Nigeria Amateur League'           WHERE auto_created AND tier = 'nacional' AND country = 'NG' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Botola Pro 1'                     WHERE auto_created AND tier = 'nacional' AND country = 'MA' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Botola Pro 2'                     WHERE auto_created AND tier = 'nacional' AND country = 'MA' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Botola Amateur 1'                 WHERE auto_created AND tier = 'nacional' AND country = 'MA' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Botola Amateur 2'                 WHERE auto_created AND tier = 'nacional' AND country = 'MA' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Ligue 1 Tunisienne'               WHERE auto_created AND tier = 'nacional' AND country = 'TN' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Ligue 2 Tunisia'                  WHERE auto_created AND tier = 'nacional' AND country = 'TN' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Ligue 3 Tunisia'                  WHERE auto_created AND tier = 'nacional' AND country = 'TN' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Ligue 4 Tunisia'                  WHERE auto_created AND tier = 'nacional' AND country = 'TN' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Ligue 1 Sénégal'                  WHERE auto_created AND tier = 'nacional' AND country = 'SN' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Ligue 2 Sénégal'                  WHERE auto_created AND tier = 'nacional' AND country = 'SN' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'National 1 Sénégal'               WHERE auto_created AND tier = 'nacional' AND country = 'SN' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'National 2 Sénégal'               WHERE auto_created AND tier = 'nacional' AND country = 'SN' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Ghana Premier League'             WHERE auto_created AND tier = 'nacional' AND country = 'GH' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Division One League'              WHERE auto_created AND tier = 'nacional' AND country = 'GH' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Division Two Ghana'               WHERE auto_created AND tier = 'nacional' AND country = 'GH' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Division Three Ghana'             WHERE auto_created AND tier = 'nacional' AND country = 'GH' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Elite One'                        WHERE auto_created AND tier = 'nacional' AND country = 'CM' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Elite Two'                        WHERE auto_created AND tier = 'nacional' AND country = 'CM' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'MTN Elite Three'                  WHERE auto_created AND tier = 'nacional' AND country = 'CM' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Regional League Cameroon'         WHERE auto_created AND tier = 'nacional' AND country = 'CM' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Qatar Stars League'               WHERE auto_created AND tier = 'nacional' AND country = 'QA' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Qatari Second Division'           WHERE auto_created AND tier = 'nacional' AND country = 'QA' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Qatari Third Division'            WHERE auto_created AND tier = 'nacional' AND country = 'QA' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Qatari Fourth Division'           WHERE auto_created AND tier = 'nacional' AND country = 'QA' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Persian Gulf Pro League'          WHERE auto_created AND tier = 'nacional' AND country = 'IR' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Azadegan League'                  WHERE auto_created AND tier = 'nacional' AND country = 'IR' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'League 2 Iran'                    WHERE auto_created AND tier = 'nacional' AND country = 'IR' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'League 3 Iran'                    WHERE auto_created AND tier = 'nacional' AND country = 'IR' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'UAE Pro League'                   WHERE auto_created AND tier = 'nacional' AND country = 'AE' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'UAE First Division'               WHERE auto_created AND tier = 'nacional' AND country = 'AE' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'UAE Second Division'              WHERE auto_created AND tier = 'nacional' AND country = 'AE' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'UAE Third Division'               WHERE auto_created AND tier = 'nacional' AND country = 'AE' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Primera División CR'              WHERE auto_created AND tier = 'nacional' AND country = 'CR' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Liga de Ascenso CR'               WHERE auto_created AND tier = 'nacional' AND country = 'CR' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Segunda División CR'              WHERE auto_created AND tier = 'nacional' AND country = 'CR' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Tercera División CR'              WHERE auto_created AND tier = 'nacional' AND country = 'CR' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Liga Nacional HN'                 WHERE auto_created AND tier = 'nacional' AND country = 'HN' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Liga de Ascenso HN'               WHERE auto_created AND tier = 'nacional' AND country = 'HN' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Segunda División HN'              WHERE auto_created AND tier = 'nacional' AND country = 'HN' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Liga Mayor HN'                    WHERE auto_created AND tier = 'nacional' AND country = 'HN' AND tier_level = 4;

UPDATE public.multiplayer_leagues SET name = 'Liga Panameña'                    WHERE auto_created AND tier = 'nacional' AND country = 'PA' AND tier_level = 1;
UPDATE public.multiplayer_leagues SET name = 'Liga Prom'                        WHERE auto_created AND tier = 'nacional' AND country = 'PA' AND tier_level = 2;
UPDATE public.multiplayer_leagues SET name = 'Liga Distritales PA'              WHERE auto_created AND tier = 'nacional' AND country = 'PA' AND tier_level = 3;
UPDATE public.multiplayer_leagues SET name = 'Liga Provincial PA'               WHERE auto_created AND tier = 'nacional' AND country = 'PA' AND tier_level = 4;