/**
 * excel_to_firestore.js
 * ترحيل بيانات الطلاب من Excel إلى Firestore باستخدام Firebase Admin SDK
 *
 * الاستخدام:
 *   node excel_to_firestore.js ../data/students_template.xlsx
 *
 * المتطلبات:
 *   - ضع serviceAccountKey.json بجانب هذا الملف (من Firebase Console → Service accounts)
 *   - npm i
 *     سيقوم بتثبيت firebase-admin و xlsx من package.json
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const XLSX = require('xlsx');

// 1) تحميل مفتاح الخدمة
const serviceKeyPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceKeyPath)) {
  console.error('❌ لم يتم العثور على serviceAccountKey.json في مجلد scripts/.');
  console.error('ضع ملف الحساب الخدمي هنا ثم أعد المحاولة.');
  process.exit(1);
}

// 2) تهيئة Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(require(serviceKeyPath)),
});
const db = admin.firestore();

// 3) قراءة مسار الإكسل
const excelPath = process.argv[2];
if (!excelPath) {
  console.error('❌ الرجاء تمرير مسار ملف الإكسل:');
  console.error('مثال: node excel_to_firestore.js ../data/students_template.xlsx');
  process.exit(1);
}
if (!fs.existsSync(excelPath)) {
  console.error('❌ ملف الإكسل غير موجود:', excelPath);
  process.exit(1);
}

// 4) قراءة ملف الإكسل
const wb = XLSX.readFile(excelPath);

// Sheet: students
const studentsSheet = wb.Sheets['students'];
if (!studentsSheet) {
  console.error('❌ ورقة "students" غير موجودة في الإكسل.');
  process.exit(1);
}
const studentsRows = XLSX.utils.sheet_to_json(studentsSheet, { defval: null });

// Sheet: grades
const gradesSheet = wb.Sheets['grades'];
if (!gradesSheet) {
  console.error('❌ ورقة "grades" غير موجودة في الإكسل.');
  process.exit(1);
}
const gradesRows = XLSX.utils.sheet_to_json(gradesSheet, { defval: null });

// 5) تجميع الدرجات حسب nid
const gradesByNid = {};
for (const g of gradesRows) {
  const nid = String(g.nid || '').trim();
  const subject = g.subject;
  const score = Number(g.score);
  if (!nid) continue;
  if (!gradesByNid[nid]) gradesByNid[nid] = [];
  if (subject != null && !Number.isNaN(score)) {
    gradesByNid[nid].push({ subject, score });
  }
}

(async () => {
  console.log('🚀 بدء الترحيل إلى Firestore ...');
  const batch = db.batch();
  let count = 0;

  for (const s of studentsRows) {
    const nid = String(s.nid || '').trim();
    if (!nid) {
      console.warn('⚠️ سطر بدون nid — تم تجاوزه:', s);
      continue;
    }

    const ref = db.collection('students').doc(nid);
    const payload = {
      name: s.name ?? null,
      class: s.class ?? null,
      total: (s.total !== null && s.total !== undefined) ? Number(s.total) : null,
      notes: s.notes ?? null,
      grades: gradesByNid[nid] || [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    batch.set(ref, payload, { merge: true });
    count++;

    // لسلامة الكوتا: نفّذ كل 400 عملية
    if (count % 400 === 0) {
      await batch.commit();
      console.log(`✅ تم ترحيل ${count} طالب ...`);
    }
  }

  // نفّذ بقية العمليات
  await batch.commit();
  console.log(`🎉 تم الترحيل بنجاح. إجمالي الطلاب: ${count}`);
})().catch(err => {
  console.error('❌ خطأ أثناء الترحيل:', err);
  process.exit(1);
});
