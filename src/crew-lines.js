const VERDICT_KEYS = ["accept", "reject", "needs-context"];

const DEFAULT_SPEAKERS = Object.freeze({
  franky: "Franky",
  zoro: "Zoro",
  usopp: "Usopp",
  jinbe: "Jinbe",
  robin: "Robin",
  nami: "Nami"
});

const CREW_LINE_CATALOG = Object.freeze({
  en: locale(null, {
    franky: ["Parts fit. The build holds.", "The frame is off. Rework the loose piece.", "The blueprint is short. Bring the missing spec."],
    zoro: ["Review is done. No blocking edge remains.", "The path is off. Fix the blocking edge.", "I need a clearer trail before I can call this."],
    usopp: ["Target checked. The test passed.", "The shot missed. Reproduce the failure and adjust.", "No target yet. Give me the exact scenario."],
    jinbe: ["The flow is steady. This gate can close.", "The current is wrong. Hold the gate and repair it.", "The tide is unclear. Bring the missing proof first."],
    robin: ["Record checked. Evidence and conclusion agree.", "The record disagrees. This conclusion cannot stand.", "The archive is incomplete. Add the missing evidence."],
    nami: ["Route checked. The next step is clear.", "The route is unsafe. Correct the course first.", "The map has a blank spot. Mark the missing path."]
  }),
  ko: locale({ franky: "프랭키", zoro: "조로", usopp: "우솝", jinbe: "징베", robin: "로빈", nami: "나미" }, {
    franky: ["부품이 맞았고 빌드도 버틴다.", "프레임이 어긋났다. 헐거운 부분부터 다시 잡자.", "설계도가 부족하다. 빠진 조건을 먼저 가져와라."],
    zoro: ["리뷰는 끝났다. 막는 결함은 없다.", "길이 어긋났다. 막는 결함부터 베어내자.", "판단할 길이 흐리다. 증거를 더 밝혀라."],
    usopp: ["표적 확인. 테스트는 통과했다.", "탄착이 빗나갔다. 실패를 재현하고 다시 조준하자.", "아직 표적이 없다. 정확한 시나리오를 줘라."],
    jinbe: ["흐름은 안정됐다. 이 게이트는 닫아도 된다.", "흐름이 거칠다. 게이트를 잡고 고쳐라.", "물길이 흐리다. 빠진 증거부터 가져와라."],
    robin: ["기록 확인. 증거와 결론이 일치한다.", "기록이 어긋난다. 이 결론은 세울 수 없다.", "기록이 비었다. 빠진 증거를 보태라."],
    nami: ["항로 확인. 다음 단계는 맑다.", "항로가 위험하다. 먼저 방향을 바로잡자.", "지도에 빈칸이 있다. 빠진 경로를 표시해라."]
  }),
  ja: locale({ franky: "フランキー", zoro: "ゾロ", usopp: "ウソップ", jinbe: "ジンベエ", robin: "ロビン", nami: "ナミ" }, {
    franky: ["部品は噛み合った。ビルドも持つ。", "フレームがずれている。緩い部分を直そう。", "設計図が足りない。必要な条件を出してくれ。"],
    zoro: ["レビュー完了。止める刃は残っていない。", "道が外れている。止める傷を直せ。", "判断する道筋が薄い。証拠を足してくれ。"],
    usopp: ["標的確認。テストは通った。", "着弾が外れた。失敗を再現して狙い直そう。", "まだ標的がない。正確なシナリオをくれ。"],
    jinbe: ["流れは安定した。このゲートは閉じられる。", "流れが荒い。ゲートを保って直そう。", "水路が見えない。足りない証拠を先に出してくれ。"],
    robin: ["記録確認。証拠と結論は一致している。", "記録が食い違う。この結論は立たない。", "記録が欠けている。足りない証拠を追加して。"],
    nami: ["航路確認。次の一手は晴れている。", "航路が危ない。まず方向を直そう。", "地図に空白がある。足りない道を示して。"]
  }),
  zh: locale({ franky: "弗兰奇", zoro: "索隆", usopp: "乌索普", jinbe: "甚平", robin: "罗宾", nami: "娜美" }, {
    franky: ["部件已经吻合，构建站得住。", "框架偏了，先修松动处。", "蓝图不完整，先补上缺的条件。"],
    zoro: ["审查完成，没有阻塞项。", "路线偏了，先修阻塞项。", "证据路径不清，先补足再判断。"],
    usopp: ["目标确认，测试通过。", "命中偏了，复现失败后再校准。", "目标还不清，给出准确场景。"],
    jinbe: ["流程稳定，这道门可以关闭。", "水流不稳，先守住门再修。", "水路不明，先带来缺失证据。"],
    robin: ["记录确认，证据和结论一致。", "记录冲突，这个结论不能成立。", "档案缺页，补上缺失证据。"],
    nami: ["航线确认，下一步清楚。", "航线有险，先修正方向。", "地图有空白，标出缺失路径。"]
  }),
  es: locale(null, {
    franky: ["Las piezas encajan. La build resiste.", "El marco falla. Ajusta la pieza floja.", "Falta el plano. Trae la especificación pendiente."],
    zoro: ["Revisión lista. No queda bloqueo.", "La ruta está mal. Corrige el bloqueo.", "Necesito un rastro más claro para decidir."],
    usopp: ["Objetivo confirmado. La prueba pasó.", "El disparo falló. Reproduce el fallo y ajusta.", "Aún no hay objetivo. Dame el escenario exacto."],
    jinbe: ["El flujo está estable. Este gate puede cerrarse.", "La corriente va mal. Sostén el gate y repara.", "La marea no está clara. Trae primero la prueba faltante."],
    robin: ["Registro revisado. Evidencia y conclusión coinciden.", "El registro no coincide. Esta conclusión no se sostiene.", "El archivo está incompleto. Añade la evidencia faltante."],
    nami: ["Ruta revisada. El siguiente paso está claro.", "La ruta es insegura. Corrige el rumbo primero.", "Hay un hueco en el mapa. Marca la ruta faltante."]
  }),
  fr: locale(null, {
    franky: ["Les pièces s'accordent. Le build tient.", "La structure dévie. Répare la pièce lâche.", "Le plan est incomplet. Ajoute la spécification manquante."],
    zoro: ["Revue terminée. Aucun blocage restant.", "Le chemin dévie. Corrige le blocage.", "La piste manque de preuves. Ajoute ce qui manque."],
    usopp: ["Cible confirmée. Le test est passé.", "Le tir a raté. Reproduis l'échec et ajuste.", "Pas encore de cible. Donne le scénario exact."],
    jinbe: ["Le flux est stable. Ce gate peut se fermer.", "Le courant est mauvais. Garde le gate et répare.", "La marée est floue. Apporte d'abord la preuve manquante."],
    robin: ["Dossier vérifié. Preuve et conclusion concordent.", "Le dossier contredit la conclusion. Elle ne tient pas.", "L'archive est incomplète. Ajoute la preuve manquante."],
    nami: ["Route vérifiée. La prochaine étape est claire.", "La route est risquée. Corrige le cap d'abord.", "La carte a un blanc. Marque le chemin manquant."]
  }),
  de: locale(null, {
    franky: ["Die Teile sitzen. Der Build hält.", "Der Rahmen ist schief. Repariere das lose Teil.", "Der Plan ist unvollständig. Bring die fehlende Vorgabe."],
    zoro: ["Review erledigt. Kein Blocker bleibt.", "Der Pfad ist falsch. Behebe den Blocker.", "Die Spur ist zu dünn. Bring erst mehr Beweise."],
    usopp: ["Ziel bestätigt. Der Test ist durch.", "Der Schuss ging daneben. Reproduziere den Fehler und justiere.", "Noch kein klares Ziel. Gib das genaue Szenario."],
    jinbe: ["Der Fluss ist ruhig. Dieses Gate kann schließen.", "Die Strömung stimmt nicht. Halte das Gate und repariere.", "Die Lage ist unklar. Bring zuerst den fehlenden Beweis."],
    robin: ["Akte geprüft. Beweis und Schluss passen.", "Die Akte widerspricht sich. Dieser Schluss hält nicht.", "Das Archiv ist lückenhaft. Ergänze den fehlenden Beweis."],
    nami: ["Route geprüft. Der nächste Schritt ist klar.", "Die Route ist unsicher. Korrigiere zuerst den Kurs.", "Auf der Karte fehlt etwas. Markiere den fehlenden Pfad."]
  }),
  it: locale(null, {
    franky: ["I pezzi combaciano. La build regge.", "Il telaio è fuori linea. Sistema il pezzo lento.", "Il progetto è incompleto. Porta la specifica mancante."],
    zoro: ["Revisione chiusa. Non resta un blocco.", "Il sentiero è sbagliato. Correggi il blocco.", "La traccia è troppo debole. Aggiungi prove."],
    usopp: ["Bersaglio confermato. Il test è passato.", "Il colpo è andato fuori. Riproduci l'errore e regola.", "Manca il bersaglio. Dammi lo scenario preciso."],
    jinbe: ["Il flusso è stabile. Questo gate può chiudersi.", "La corrente è sbagliata. Tieni il gate e ripara.", "La marea è poco chiara. Porta prima la prova mancante."],
    robin: ["Registro verificato. Prova e conclusione combaciano.", "Il registro non torna. Questa conclusione non regge.", "L'archivio è incompleto. Aggiungi la prova mancante."],
    nami: ["Rotta verificata. Il prossimo passo è chiaro.", "La rotta è rischiosa. Correggi prima la direzione.", "La mappa ha un vuoto. Segna il percorso mancante."]
  }),
  pt: locale(null, {
    franky: ["As peças encaixam. O build segura.", "A estrutura saiu do lugar. Refaça a peça solta.", "O plano está curto. Traga a especificação faltante."],
    zoro: ["Revisão pronta. Nenhum bloqueio ficou.", "O caminho está errado. Corrija o bloqueio.", "A trilha está fraca. Traga mais evidência antes."],
    usopp: ["Alvo confirmado. O teste passou.", "O disparo errou. Reproduza a falha e ajuste.", "Ainda não há alvo. Dê o cenário exato."],
    jinbe: ["O fluxo está estável. Este gate pode fechar.", "A corrente está errada. Segure o gate e repare.", "A maré está incerta. Traga primeiro a prova faltante."],
    robin: ["Registro conferido. Evidência e conclusão batem.", "O registro discorda. Essa conclusão não se sustenta.", "O arquivo está incompleto. Adicione a evidência faltante."],
    nami: ["Rota conferida. O próximo passo está claro.", "A rota é insegura. Corrija o curso primeiro.", "Há um vazio no mapa. Marque o caminho faltante."]
  }),
  id: locale(null, {
    franky: ["Komponen pas. Build bertahan.", "Rangkanya meleset. Perbaiki bagian yang longgar.", "Blueprint kurang lengkap. Bawa spesifikasi yang hilang."],
    zoro: ["Review selesai. Tidak ada blocker tersisa.", "Jalurnya salah. Perbaiki blocker dulu.", "Jejaknya belum jelas. Tambahkan bukti dulu."],
    usopp: ["Target jelas. Tes lulus.", "Tembakan meleset. Reproduksi kegagalan lalu setel lagi.", "Target belum ada. Beri skenario yang tepat."],
    jinbe: ["Alurnya stabil. Gate ini bisa ditutup.", "Arusnya salah. Tahan gate dan perbaiki.", "Arus belum jelas. Bawa bukti yang hilang dulu."],
    robin: ["Catatan dicek. Bukti dan kesimpulan cocok.", "Catatan bertentangan. Kesimpulan ini belum berdiri.", "Arsip belum lengkap. Tambahkan bukti yang hilang."],
    nami: ["Rute dicek. Langkah berikutnya jelas.", "Rute tidak aman. Luruskan arah dulu.", "Ada bagian kosong di peta. Tandai jalur yang hilang."]
  }),
  hi: locale(null, {
    franky: ["हिस्से फिट हैं। बिल्ड टिकता है।", "फ्रेम टेढ़ा है। ढीला हिस्सा सुधारो।", "नक्शा अधूरा है। छूटी शर्त लाओ।"],
    zoro: ["रिव्यू पूरा। कोई रोकने वाली कमी नहीं।", "रास्ता बिगड़ा है। रोकने वाली कमी सुधारो।", "सबूत की राह साफ नहीं। पहले सबूत जोड़ो।"],
    usopp: ["निशाना पक्का। टेस्ट पास हुआ।", "वार चूक गया। विफलता दोहराकर फिर निशाना लगाओ।", "निशाना साफ नहीं। सटीक परिदृश्य दो।"],
    jinbe: ["बहाव स्थिर है। यह गेट बंद हो सकता है।", "बहाव खराब है। गेट रोको और सुधारो।", "रास्ता धुंधला है। पहले छूटा सबूत लाओ।"],
    robin: ["रिकॉर्ड जांचा। सबूत और निष्कर्ष मिलते हैं।", "रिकॉर्ड टकराता है। यह निष्कर्ष नहीं टिकेगा।", "अभिलेख अधूरा है। छूटा सबूत जोड़ो।"],
    nami: ["रास्ता जांचा। अगला कदम साफ है।", "रास्ता असुरक्षित है। पहले दिशा सुधारो।", "नक्शे में खाली जगह है। छूटा रास्ता चिह्नित करो।"]
  }),
  tr: locale(null, {
    franky: ["Parçalar oturdu. Derleme dayanıyor.", "Çerçeve kaydı. Gevşek parçayı düzelt.", "Plan eksik. Eksik şartı getir."],
    zoro: ["İnceleme bitti. Engel kalmadı.", "Yol sapmış. Engeli düzelt.", "İz net değil. Karar için kanıtı artır."],
    usopp: ["Hedef doğrulandı. Test geçti.", "Atış şaştı. Hatayı yeniden üret ve ayarla.", "Hedef yok. Tam senaryoyu ver."],
    jinbe: ["Akış dengeli. Bu kapı kapanabilir.", "Akıntı yanlış. Kapıyı tut ve onar.", "Su yolu belirsiz. Önce eksik kanıtı getir."],
    robin: ["Kayıt incelendi. Kanıt ve sonuç uyuşuyor.", "Kayıt çelişiyor. Bu sonuç ayakta durmaz.", "Arşiv eksik. Eksik kanıtı ekle."],
    nami: ["Rota kontrol edildi. Sonraki adım açık.", "Rota güvenli değil. Önce yönü düzelt.", "Haritada boşluk var. Eksik yolu işaretle."]
  }),
  vi: locale(null, {
    franky: ["Các mảnh đã khớp. Bản build đứng vững.", "Khung bị lệch. Sửa phần lỏng trước.", "Bản vẽ còn thiếu. Mang điều kiện còn thiếu vào."],
    zoro: ["Review xong. Không còn lỗi chặn.", "Đường đi lệch. Sửa lỗi chặn trước.", "Dấu vết chưa rõ. Thêm bằng chứng rồi kết luận."],
    usopp: ["Mục tiêu đã rõ. Test đã qua.", "Phát bắn lệch. Tái hiện lỗi rồi chỉnh lại.", "Chưa có mục tiêu. Đưa đúng kịch bản."],
    jinbe: ["Luồng ổn định. Gate này có thể đóng.", "Dòng chảy sai. Giữ gate và sửa.", "Dòng nước chưa rõ. Mang bằng chứng thiếu vào trước."],
    robin: ["Hồ sơ đã kiểm. Bằng chứng khớp kết luận.", "Hồ sơ mâu thuẫn. Kết luận này chưa đứng vững.", "Lưu trữ còn thiếu. Thêm bằng chứng còn thiếu."],
    nami: ["Tuyến đường đã kiểm. Bước tiếp theo rõ ràng.", "Tuyến đường không an toàn. Chỉnh hướng trước.", "Bản đồ còn trống. Đánh dấu đường còn thiếu."]
  }),
  ru: locale(null, {
    franky: ["Детали сошлись. Сборка держится.", "Каркас ушел в сторону. Почини слабое место.", "Чертеж неполный. Принеси недостающее условие."],
    zoro: ["Ревью завершено. Блокеров нет.", "Путь сбился. Исправь блокер.", "След неясен. Добавь доказательства перед решением."],
    usopp: ["Цель подтверждена. Тест прошел.", "Выстрел ушел мимо. Воспроизведи сбой и поправь.", "Цели еще нет. Дай точный сценарий."],
    jinbe: ["Поток стабилен. Этот gate можно закрыть.", "Течение неверное. Держи gate и чини.", "Путь мутный. Сначала принеси недостающее доказательство."],
    robin: ["Запись проверена. Доказательства и вывод совпали.", "Запись спорит с выводом. Так не пройдет.", "Архив неполный. Добавь недостающее доказательство."],
    nami: ["Маршрут проверен. Следующий шаг ясен.", "Маршрут опасен. Сначала поправь курс.", "На карте пробел. Отметь недостающий путь."]
  }),
  ar: locale(null, {
    franky: ["الأجزاء متطابقة. البناء ثابت.", "الإطار منحرف. أصلح القطعة المرتخية.", "المخطط ناقص. أحضر الشرط المفقود."],
    zoro: ["انتهت المراجعة. لا يوجد مانع.", "المسار منحرف. أصلح العائق.", "الأثر غير واضح. أضف الدليل قبل الحكم."],
    usopp: ["الهدف مؤكد. الاختبار نجح.", "الطلقة أخطأت. أعد إنتاج الفشل ثم اضبط.", "لا هدف واضح بعد. أعطني السيناريو الدقيق."],
    jinbe: ["التدفق مستقر. يمكن إغلاق هذا الباب.", "التيار خاطئ. أمسك الباب وأصلح.", "المسار غير واضح. أحضر الدليل الناقص أولاً."],
    robin: ["تم فحص السجل. الدليل والنتيجة متطابقان.", "السجل يتعارض. هذه النتيجة لا تثبت.", "الأرشيف ناقص. أضف الدليل المفقود."],
    nami: ["تم فحص الطريق. الخطوة التالية واضحة.", "الطريق غير آمن. صحح المسار أولاً.", "الخريطة فيها فراغ. حدّد الطريق الناقص."]
  }),
  th: locale(null, {
    franky: ["ชิ้นส่วนเข้าที่แล้ว บิลด์ยังมั่นคง", "โครงเบี้ยว แก้ชิ้นที่หลวมก่อน", "แบบยังขาด เติมเงื่อนไขที่หายไปก่อน"],
    zoro: ["รีวิวจบแล้ว ไม่มีตัวบล็อกเหลือ", "ทางผิด แก้ตัวบล็อกก่อน", "ร่องรอยยังไม่ชัด เพิ่มหลักฐานก่อนตัดสิน"],
    usopp: ["ยืนยันเป้าแล้ว เทสต์ผ่าน", "ยิงพลาด ทำซ้ำความล้มเหลวแล้วปรับใหม่", "ยังไม่มีเป้าชัดเจน ขอฉากทดสอบที่แน่นอน"],
    jinbe: ["กระแสนิ่งแล้ว gate นี้ปิดได้", "กระแสผิด จับ gate ไว้แล้วซ่อม", "ทางน้ำยังไม่ชัด เอาหลักฐานที่ขาดมาก่อน"],
    robin: ["ตรวจบันทึกแล้ว หลักฐานตรงกับข้อสรุป", "บันทึกขัดกัน ข้อสรุปนี้ยังยืนไม่ได้", "คลังข้อมูลยังขาด เติมหลักฐานที่หายไป"],
    nami: ["ตรวจเส้นทางแล้ว ขั้นต่อไปชัดเจน", "เส้นทางไม่ปลอดภัย แก้ทิศก่อน", "แผนที่มีช่องว่าง ทำเครื่องหมายทางที่หายไป"]
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
