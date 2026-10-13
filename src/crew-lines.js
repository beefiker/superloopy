const VERDICT_KEYS = ["accept", "reject", "needs-context"];

const DEFAULT_SPEAKERS = Object.freeze({
  forge: "Forge",
  sentinel: "Sentinel",
  probe: "Probe",
  arbiter: "Arbiter",
  assayer: "Assayer",
  pathfinder: "Pathfinder"
});

const CREW_LINE_CATALOG = Object.freeze({
  en: locale(null, {
    forge: ["Parts fit. The build holds.", "The frame is off. Rework the loose piece.", "The blueprint is short. Bring the missing spec."],
    sentinel: ["Review is done. No blocking issue remains.", "The change is off. Fix the blocking issue.", "I need a clearer trail before I can call this."],
    probe: ["Scenario checked. The test passed.", "The check failed. Reproduce the failure and adjust.", "No scenario yet. Give me the exact steps."],
    arbiter: ["All evidence agrees. This gate can close.", "The evidence conflicts. Hold the gate and repair it.", "The case is incomplete. Bring the missing proof first."],
    assayer: ["Record checked. Evidence and conclusion agree.", "The record disagrees. This conclusion cannot stand.", "The archive is incomplete. Add the missing evidence."],
    pathfinder: ["Route checked. The next step is clear.", "The route is unsafe. Correct the course first.", "The map has a blank spot. Mark the missing path."]
  }),
  ko: locale({ forge: "포지", sentinel: "센티넬", probe: "프로브", arbiter: "아비터", assayer: "어세이어", pathfinder: "패스파인더" }, {
    forge: ["부품이 맞았고 빌드도 버틴다.", "프레임이 어긋났다. 헐거운 부분부터 다시 잡자.", "설계도가 부족하다. 빠진 조건을 먼저 가져와라."],
    sentinel: ["리뷰는 끝났다. 막는 결함은 없다.", "변경이 어긋났다. 막는 결함부터 고치자.", "판단할 근거가 흐리다. 증거를 더 밝혀라."],
    probe: ["시나리오 확인. 테스트는 통과했다.", "검사가 실패했다. 실패를 재현하고 다시 맞추자.", "아직 시나리오가 없다. 정확한 절차를 줘라."],
    arbiter: ["증거가 모두 맞는다. 이 게이트는 닫아도 된다.", "증거가 서로 어긋난다. 게이트를 잡고 고쳐라.", "판단할 근거가 모자라다. 빠진 증거부터 가져와라."],
    assayer: ["기록 확인. 증거와 결론이 일치한다.", "기록이 어긋난다. 이 결론은 세울 수 없다.", "기록이 비었다. 빠진 증거를 보태라."],
    pathfinder: ["항로 확인. 다음 단계는 맑다.", "항로가 위험하다. 먼저 방향을 바로잡자.", "지도에 빈칸이 있다. 빠진 경로를 표시해라."]
  }),
  ja: locale({ forge: "フォージ", sentinel: "センチネル", probe: "プローブ", arbiter: "アービター", assayer: "アセイヤー", pathfinder: "パスファインダー" }, {
    forge: ["部品は噛み合った。ビルドも持つ。", "フレームがずれている。緩い部分を直そう。", "設計図が足りない。必要な条件を出してくれ。"],
    sentinel: ["レビュー完了。止める欠陥は残っていない。", "変更がずれている。止める欠陥を直せ。", "判断する根拠が薄い。証拠を足してくれ。"],
    probe: ["シナリオ確認。テストは通った。", "検査が失敗した。失敗を再現して調整しよう。", "まだシナリオがない。正確な手順をくれ。"],
    arbiter: ["証拠はそろった。このゲートは閉じられる。", "証拠が食い違う。ゲートを保って直そう。", "判断材料が足りない。足りない証拠を先に出してくれ。"],
    assayer: ["記録確認。証拠と結論は一致している。", "記録が食い違う。この結論は立たない。", "記録が欠けている。足りない証拠を追加して。"],
    pathfinder: ["航路確認。次の一手は晴れている。", "航路が危ない。まず方向を直そう。", "地図に空白がある。足りない道を示して。"]
  }),
  zh: locale({ forge: "构筑者", sentinel: "哨卫", probe: "探针", arbiter: "裁定者", assayer: "鉴证官", pathfinder: "领航员" }, {
    forge: ["部件已经吻合，构建站得住。", "框架偏了，先修松动处。", "蓝图不完整，先补上缺的条件。"],
    sentinel: ["审查完成，没有阻塞项。", "改动偏了，先修阻塞项。", "证据路径不清，先补足再判断。"],
    probe: ["场景确认，测试通过。", "检查失败，复现失败后再调整。", "场景还不清，给出准确步骤。"],
    arbiter: ["证据一致，这道门可以关闭。", "证据冲突，先守住门再修。", "依据不足，先带来缺失证据。"],
    assayer: ["记录确认，证据和结论一致。", "记录冲突，这个结论不能成立。", "档案缺页，补上缺失证据。"],
    pathfinder: ["航线确认，下一步清楚。", "航线有险，先修正方向。", "地图有空白，标出缺失路径。"]
  }),
  es: locale(null, {
    forge: ["Las piezas encajan. La build resiste.", "El marco falla. Ajusta la pieza floja.", "Falta el plano. Trae la especificación pendiente."],
    sentinel: ["Revisión lista. No queda bloqueo.", "El cambio está mal. Corrige el bloqueo.", "Necesito un rastro más claro para decidir."],
    probe: ["Escenario confirmado. La prueba pasó.", "La comprobación falló. Reproduce el fallo y ajusta.", "Aún no hay escenario. Dame los pasos exactos."],
    arbiter: ["La evidencia coincide. Este gate puede cerrarse.", "La evidencia choca. Sostén el gate y repara.", "El caso está incompleto. Trae primero la prueba faltante."],
    assayer: ["Registro revisado. Evidencia y conclusión coinciden.", "El registro no coincide. Esta conclusión no se sostiene.", "El archivo está incompleto. Añade la evidencia faltante."],
    pathfinder: ["Ruta revisada. El siguiente paso está claro.", "La ruta es insegura. Corrige el rumbo primero.", "Hay un hueco en el mapa. Marca la ruta faltante."]
  }),
  fr: locale(null, {
    forge: ["Les pièces s'accordent. Le build tient.", "La structure dévie. Répare la pièce lâche.", "Le plan est incomplet. Ajoute la spécification manquante."],
    sentinel: ["Revue terminée. Aucun blocage restant.", "Le changement dévie. Corrige le blocage.", "La piste manque de preuves. Ajoute ce qui manque."],
    probe: ["Scénario confirmé. Le test est passé.", "La vérification a échoué. Reproduis l'échec et ajuste.", "Pas encore de scénario. Donne les étapes exactes."],
    arbiter: ["Les preuves concordent. Ce gate peut se fermer.", "Les preuves se contredisent. Garde le gate et répare.", "Le dossier est incomplet. Apporte d'abord la preuve manquante."],
    assayer: ["Dossier vérifié. Preuve et conclusion concordent.", "Le dossier contredit la conclusion. Elle ne tient pas.", "L'archive est incomplète. Ajoute la preuve manquante."],
    pathfinder: ["Route vérifiée. La prochaine étape est claire.", "La route est risquée. Corrige le cap d'abord.", "La carte a un blanc. Marque le chemin manquant."]
  }),
  de: locale(null, {
    forge: ["Die Teile sitzen. Der Build hält.", "Der Rahmen ist schief. Repariere das lose Teil.", "Der Plan ist unvollständig. Bring die fehlende Vorgabe."],
    sentinel: ["Review erledigt. Kein Blocker bleibt.", "Die Änderung ist falsch. Behebe den Blocker.", "Die Spur ist zu dünn. Bring erst mehr Beweise."],
    probe: ["Szenario bestätigt. Der Test ist durch.", "Die Prüfung schlug fehl. Reproduziere den Fehler und justiere.", "Noch kein klares Szenario. Gib die genauen Schritte."],
    arbiter: ["Die Beweise stimmen überein. Dieses Gate kann schließen.", "Die Beweise widersprechen sich. Halte das Gate und repariere.", "Die Lage ist unklar. Bring zuerst den fehlenden Beweis."],
    assayer: ["Akte geprüft. Beweis und Schluss passen.", "Die Akte widerspricht sich. Dieser Schluss hält nicht.", "Das Archiv ist lückenhaft. Ergänze den fehlenden Beweis."],
    pathfinder: ["Route geprüft. Der nächste Schritt ist klar.", "Die Route ist unsicher. Korrigiere zuerst den Kurs.", "Auf der Karte fehlt etwas. Markiere den fehlenden Pfad."]
  }),
  it: locale(null, {
    forge: ["I pezzi combaciano. La build regge.", "Il telaio è fuori linea. Sistema il pezzo lento.", "Il progetto è incompleto. Porta la specifica mancante."],
    sentinel: ["Revisione chiusa. Non resta un blocco.", "La modifica è sbagliata. Correggi il blocco.", "La traccia è troppo debole. Aggiungi prove."],
    probe: ["Scenario confermato. Il test è passato.", "La verifica è fallita. Riproduci l'errore e regola.", "Manca lo scenario. Dammi i passi precisi."],
    arbiter: ["Le prove concordano. Questo gate può chiudersi.", "Le prove sono in conflitto. Tieni il gate e ripara.", "Il caso è incompleto. Porta prima la prova mancante."],
    assayer: ["Registro verificato. Prova e conclusione combaciano.", "Il registro non torna. Questa conclusione non regge.", "L'archivio è incompleto. Aggiungi la prova mancante."],
    pathfinder: ["Rotta verificata. Il prossimo passo è chiaro.", "La rotta è rischiosa. Correggi prima la direzione.", "La mappa ha un vuoto. Segna il percorso mancante."]
  }),
  pt: locale(null, {
    forge: ["As peças encaixam. O build segura.", "A estrutura saiu do lugar. Refaça a peça solta.", "O plano está curto. Traga a especificação faltante."],
    sentinel: ["Revisão pronta. Nenhum bloqueio ficou.", "A mudança está errada. Corrija o bloqueio.", "A trilha está fraca. Traga mais evidência antes."],
    probe: ["Cenário confirmado. O teste passou.", "A verificação falhou. Reproduza a falha e ajuste.", "Ainda não há cenário. Dê os passos exatos."],
    arbiter: ["As evidências batem. Este gate pode fechar.", "As evidências conflitam. Segure o gate e repare.", "O caso está incompleto. Traga primeiro a prova faltante."],
    assayer: ["Registro conferido. Evidência e conclusão batem.", "O registro discorda. Essa conclusão não se sustenta.", "O arquivo está incompleto. Adicione a evidência faltante."],
    pathfinder: ["Rota conferida. O próximo passo está claro.", "A rota é insegura. Corrija o curso primeiro.", "Há um vazio no mapa. Marque o caminho faltante."]
  }),
  id: locale(null, {
    forge: ["Komponen pas. Build bertahan.", "Rangkanya meleset. Perbaiki bagian yang longgar.", "Blueprint kurang lengkap. Bawa spesifikasi yang hilang."],
    sentinel: ["Review selesai. Tidak ada blocker tersisa.", "Perubahannya salah. Perbaiki blocker dulu.", "Jejaknya belum jelas. Tambahkan bukti dulu."],
    probe: ["Skenario jelas. Tes lulus.", "Pemeriksaan gagal. Reproduksi kegagalan lalu setel lagi.", "Skenario belum ada. Beri langkah yang tepat."],
    arbiter: ["Bukti sudah cocok. Gate ini bisa ditutup.", "Bukti bertentangan. Tahan gate dan perbaiki.", "Kasusnya belum lengkap. Bawa bukti yang hilang dulu."],
    assayer: ["Catatan dicek. Bukti dan kesimpulan cocok.", "Catatan bertentangan. Kesimpulan ini belum berdiri.", "Arsip belum lengkap. Tambahkan bukti yang hilang."],
    pathfinder: ["Rute dicek. Langkah berikutnya jelas.", "Rute tidak aman. Luruskan arah dulu.", "Ada bagian kosong di peta. Tandai jalur yang hilang."]
  }),
  hi: locale(null, {
    forge: ["हिस्से फिट हैं। बिल्ड टिकता है।", "फ्रेम टेढ़ा है। ढीला हिस्सा सुधारो।", "नक्शा अधूरा है। छूटी शर्त लाओ।"],
    sentinel: ["रिव्यू पूरा। कोई रोकने वाली कमी नहीं।", "बदलाव बिगड़ा है। रोकने वाली कमी सुधारो।", "सबूत की राह साफ नहीं। पहले सबूत जोड़ो।"],
    probe: ["परिदृश्य पक्का। टेस्ट पास हुआ।", "जांच विफल हुई। विफलता दोहराकर फिर समायोजित करो।", "परिदृश्य साफ नहीं। सटीक कदम दो।"],
    arbiter: ["सबूत मेल खाते हैं। यह गेट बंद हो सकता है।", "सबूत टकराते हैं। गेट रोको और सुधारो।", "मामला अधूरा है। पहले छूटा सबूत लाओ।"],
    assayer: ["रिकॉर्ड जांचा। सबूत और निष्कर्ष मिलते हैं।", "रिकॉर्ड टकराता है। यह निष्कर्ष नहीं टिकेगा।", "अभिलेख अधूरा है। छूटा सबूत जोड़ो।"],
    pathfinder: ["रास्ता जांचा। अगला कदम साफ है।", "रास्ता असुरक्षित है। पहले दिशा सुधारो।", "नक्शे में खाली जगह है। छूटा रास्ता चिह्नित करो।"]
  }),
  tr: locale(null, {
    forge: ["Parçalar oturdu. Derleme dayanıyor.", "Çerçeve kaydı. Gevşek parçayı düzelt.", "Plan eksik. Eksik şartı getir."],
    sentinel: ["İnceleme bitti. Engel kalmadı.", "Değişiklik sapmış. Engeli düzelt.", "İz net değil. Karar için kanıtı artır."],
    probe: ["Senaryo doğrulandı. Test geçti.", "Kontrol başarısız. Hatayı yeniden üret ve ayarla.", "Senaryo yok. Tam adımları ver."],
    arbiter: ["Kanıtlar uyuşuyor. Bu kapı kapanabilir.", "Kanıtlar çelişiyor. Kapıyı tut ve onar.", "Dosya eksik. Önce eksik kanıtı getir."],
    assayer: ["Kayıt incelendi. Kanıt ve sonuç uyuşuyor.", "Kayıt çelişiyor. Bu sonuç ayakta durmaz.", "Arşiv eksik. Eksik kanıtı ekle."],
    pathfinder: ["Rota kontrol edildi. Sonraki adım açık.", "Rota güvenli değil. Önce yönü düzelt.", "Haritada boşluk var. Eksik yolu işaretle."]
  }),
  vi: locale(null, {
    forge: ["Các mảnh đã khớp. Bản build đứng vững.", "Khung bị lệch. Sửa phần lỏng trước.", "Bản vẽ còn thiếu. Mang điều kiện còn thiếu vào."],
    sentinel: ["Review xong. Không còn lỗi chặn.", "Thay đổi bị lệch. Sửa lỗi chặn trước.", "Dấu vết chưa rõ. Thêm bằng chứng rồi kết luận."],
    probe: ["Kịch bản đã rõ. Test đã qua.", "Kiểm tra thất bại. Tái hiện lỗi rồi chỉnh lại.", "Chưa có kịch bản. Đưa đúng các bước."],
    arbiter: ["Bằng chứng đã khớp. Gate này có thể đóng.", "Bằng chứng mâu thuẫn. Giữ gate và sửa.", "Hồ sơ chưa đủ. Mang bằng chứng thiếu vào trước."],
    assayer: ["Hồ sơ đã kiểm. Bằng chứng khớp kết luận.", "Hồ sơ mâu thuẫn. Kết luận này chưa đứng vững.", "Lưu trữ còn thiếu. Thêm bằng chứng còn thiếu."],
    pathfinder: ["Tuyến đường đã kiểm. Bước tiếp theo rõ ràng.", "Tuyến đường không an toàn. Chỉnh hướng trước.", "Bản đồ còn trống. Đánh dấu đường còn thiếu."]
  }),
  ru: locale(null, {
    forge: ["Детали сошлись. Сборка держится.", "Каркас ушел в сторону. Почини слабое место.", "Чертеж неполный. Принеси недостающее условие."],
    sentinel: ["Ревью завершено. Блокеров нет.", "Изменение сбилось. Исправь блокер.", "След неясен. Добавь доказательства перед решением."],
    probe: ["Сценарий подтвержден. Тест прошел.", "Проверка не прошла. Воспроизведи сбой и поправь.", "Сценария еще нет. Дай точные шаги."],
    arbiter: ["Доказательства сходятся. Этот gate можно закрыть.", "Доказательства противоречат. Держи gate и чини.", "Дело неполное. Сначала принеси недостающее доказательство."],
    assayer: ["Запись проверена. Доказательства и вывод совпали.", "Запись спорит с выводом. Так не пройдет.", "Архив неполный. Добавь недостающее доказательство."],
    pathfinder: ["Маршрут проверен. Следующий шаг ясен.", "Маршрут опасен. Сначала поправь курс.", "На карте пробел. Отметь недостающий путь."]
  }),
  ar: locale(null, {
    forge: ["الأجزاء متطابقة. البناء ثابت.", "الإطار منحرف. أصلح القطعة المرتخية.", "المخطط ناقص. أحضر الشرط المفقود."],
    sentinel: ["انتهت المراجعة. لا يوجد مانع.", "التغيير منحرف. أصلح العائق.", "الأثر غير واضح. أضف الدليل قبل الحكم."],
    probe: ["السيناريو مؤكد. الاختبار نجح.", "الفحص فشل. أعد إنتاج الفشل ثم اضبط.", "لا سيناريو واضح بعد. أعطني الخطوات الدقيقة."],
    arbiter: ["الأدلة متوافقة. يمكن إغلاق هذا الباب.", "الأدلة متعارضة. أمسك الباب وأصلح.", "الملف ناقص. أحضر الدليل الناقص أولاً."],
    assayer: ["تم فحص السجل. الدليل والنتيجة متطابقان.", "السجل يتعارض. هذه النتيجة لا تثبت.", "الأرشيف ناقص. أضف الدليل المفقود."],
    pathfinder: ["تم فحص الطريق. الخطوة التالية واضحة.", "الطريق غير آمن. صحح المسار أولاً.", "الخريطة فيها فراغ. حدّد الطريق الناقص."]
  }),
  th: locale(null, {
    forge: ["ชิ้นส่วนเข้าที่แล้ว บิลด์ยังมั่นคง", "โครงเบี้ยว แก้ชิ้นที่หลวมก่อน", "แบบยังขาด เติมเงื่อนไขที่หายไปก่อน"],
    sentinel: ["รีวิวจบแล้ว ไม่มีตัวบล็อกเหลือ", "การแก้ไขผิดทาง แก้ตัวบล็อกก่อน", "ร่องรอยยังไม่ชัด เพิ่มหลักฐานก่อนตัดสิน"],
    probe: ["ยืนยันสถานการณ์แล้ว เทสต์ผ่าน", "การตรวจล้มเหลว ทำซ้ำความล้มเหลวแล้วปรับใหม่", "ยังไม่มีสถานการณ์ชัดเจน ขอขั้นตอนที่แน่นอน"],
    arbiter: ["หลักฐานตรงกันแล้ว gate นี้ปิดได้", "หลักฐานขัดกัน จับ gate ไว้แล้วซ่อม", "ข้อมูลยังไม่ครบ เอาหลักฐานที่ขาดมาก่อน"],
    assayer: ["ตรวจบันทึกแล้ว หลักฐานตรงกับข้อสรุป", "บันทึกขัดกัน ข้อสรุปนี้ยังยืนไม่ได้", "คลังข้อมูลยังขาด เติมหลักฐานที่หายไป"],
    pathfinder: ["ตรวจเส้นทางแล้ว ขั้นต่อไปชัดเจน", "เส้นทางไม่ปลอดภัย แก้ทิศก่อน", "แผนที่มีช่องว่าง ทำเครื่องหมายทางที่หายไป"]
  })
});

export const SUPPORTED_CREW_LINE_LANGUAGES = Object.freeze(Object.keys(CREW_LINE_CATALOG));

const SPOKEN_VERDICTS = new Set(VERDICT_KEYS);
const LANGUAGE_CODE_ALIASES = new Map([
  ["pt-br", "pt"], ["pt-pt", "pt"],
  ["zh-cn", "zh"], ["zh-tw", "zh"], ["zh-hans", "zh"], ["zh-hant", "zh"]
]);
const EXPLICIT_LANGUAGE_HINTS = [
  ["ko", /한국어|한글|\bkorean\b/u],
  ["ja", /日本語|にほんご|\bjapanese\b/u],
  ["zh", /中文|汉语|漢語|\b(chinese|mandarin)\b/u],
  ["es", /español|espanol|\bspanish\b/u],
  ["fr", /français|francais|\bfrench\b/u],
  ["de", /\b(deutsch|german)\b/u],
  ["it", /\b(italiano|italian)\b/u],
  ["pt", /português|portugues|\bportuguese\b|\bpt-br\b/u],
  ["id", /bahasa indonesia|\bindonesian\b/u],
  ["hi", /हिंदी|हिन्दी|\bhindi\b/u],
  ["tr", /türkçe|turkce|\bturkish\b/u],
  ["vi", /tiếng việt|tieng viet|\bvietnamese\b/u],
  ["ru", /русский|\brussian\b/u],
  ["ar", /العربية|عربي|\barabic\b/u],
  ["th", /ภาษาไทย|\bthai\b/u],
  ["en", /영어|\benglish\b/u]
];
const SCRIPT_LANGUAGE_HINTS = [
  ["ko", /[\u3131-\u318E\uAC00-\uD7A3]/u],
  ["ja", /[\u3040-\u30FF]/u],
  ["hi", /[\u0900-\u097F]/u],
  ["ar", /[\u0600-\u06FF]/u],
  ["th", /[\u0E00-\u0E7F]/u],
  ["ru", /[\u0400-\u04FF]/u],
  ["zh", /[\u4E00-\u9FFF]/u],
  ["vi", /[ăâđêôơưĂÂĐÊÔƠƯ]/u],
  ["tr", /[ğĞıİşŞ]/u],
  ["de", /[ß]/u],
  ["es", /[¿¡ñÑ]/u],
  ["pt", /[ãõÃÕ]/u]
];

export function crewLineForHandoff(handoff, options = {}) {
  if (handoff === null || typeof handoff !== "object") return null;
  const agent = normalizeAgent(handoff.agent);
  const verdict = normalizeVerdict(handoff.normalizedVerdict);
  const language = normalizeLanguage(options.language) ?? detectCrewLineLanguage(handoff.assignment, options.languageHints);
  if (!SPOKEN_VERDICTS.has(verdict)) return null;
  const catalog = CREW_LINE_CATALOG[language];
  const line = catalog?.lines[agent]?.[verdict];
  if (line === undefined) return null;
  return { agent, speaker: catalog.speakers[agent], verdict, language, line };
}

export function decorateHandoffWithCrewLine(handoff, options = {}) {
  const crewLine = crewLineForHandoff(handoff, options);
  return crewLine === null ? { ...handoff } : { ...handoff, crewLine };
}

export function formatCrewLine(crewLine) {
  if (crewLine === null || typeof crewLine !== "object") return "";
  return `${crewLine.speaker}: "${crewLine.line}"`;
}

export function detectCrewLineLanguage(...values) {
  const haystack = flattenText(values).join("\n");
  const lower = haystack.toLowerCase();
  const tagged = normalizeLanguage(lower.match(/\b(?:lang|language|locale)\s*[:=]\s*([a-z]{2,3}(?:[-_][a-z0-9]+)*)/u)?.[1]);
  if (tagged !== null) return tagged;
  for (const [language, pattern] of SCRIPT_LANGUAGE_HINTS) {
    if (pattern.test(haystack)) return language;
  }
  for (const [language, pattern] of EXPLICIT_LANGUAGE_HINTS) {
    if (pattern.test(lower)) return language;
  }
  return "en";
}

function locale(speakers, lines) {
  return {
    speakers: Object.freeze({ ...DEFAULT_SPEAKERS, ...(speakers ?? {}) }),
    lines: Object.freeze(Object.fromEntries(Object.entries(lines).map(([agent, phrases]) => [
      agent,
      Object.freeze(Object.fromEntries(VERDICT_KEYS.map((key, index) => [key, phrases[index]])))
    ])))
  };
}

function normalizeLanguage(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replaceAll("_", "-");
  const aliased = LANGUAGE_CODE_ALIASES.get(normalized) ?? normalized;
  if (Object.prototype.hasOwnProperty.call(CREW_LINE_CATALOG, aliased)) return aliased;
  const base = aliased.split("-")[0];
  return Object.prototype.hasOwnProperty.call(CREW_LINE_CATALOG, base) ? base : null;
}

function normalizeAgent(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeVerdict(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "pending";
}

function flattenText(value) {
  if (Array.isArray(value)) return value.flatMap((item) => flattenText(item));
  if (typeof value === "string") return [value];
  return [];
}
