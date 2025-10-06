# موقع درجات الطلاب + سكربت ترحيل من Excel إلى Firestore

> جهّزنا لك كل شيء: صفحات الموقع (طالب + مشرف)، قواعد Firestore، وقالب إكسل + سكربت Node.js يرحّل البيانات إلى Firestore مباشرة.

## المتطلبات السريعة
1) مشروع Firebase مفعّل فيه:
   - Authentication (Email/Password) وأنشئ مستخدمك.
   - Firestore (وضع Production).
2) استخرج خدمة حساب الخدمة (Service Account) من:
   **Firebase Console → Project Settings → Service accounts → Generate new private key**
   واحفظ الملف باسم: `serviceAccountKey.json` داخل مجلد `scripts/`.
3) ثبّت Node.js (آخر إصدار LTS).

---

## تركيب الموقع (frontend)
- عدّل `firebase.js` ببيانات تهيئة مشروعك.
- ارفع الملفات (`index.html`, `admin.html`, `firebase.js`) على GitHub Pages أو Firebase Hosting.
- في Firestore Rules ضع بريدك بدل `you@example.com` ثم انشر القواعد.

### بنية وثيقة الطالب (collection: `students`)
```json
{
  "name": "أحمد خالد",
  "class": "3/أ",
  "grades": [
    {"subject":"حاسب","score": 24},
    {"subject":"رياضيات","score": 19}
  ],
  "total": 43,
  "notes": "حضور ممتاز",
  "updatedAt": <server timestamp>
}
```

---

## قالب الإكسل
يوجد ملف: `data/students_template.xlsx` يحتوي ورقتين:

1) **students**: الأعمدة: `nid, name, class, total, notes`  
2) **grades**: الأعمدة: `nid, subject, score` (يمكن أكثر من صف لنفس الطالب)

> **nid** هو رقم الهوية ويستعمل كمفتاح الوثيقة في Firestore.

---

## سكربت الترحيل (Excel → Firestore)
المجلد: `scripts/`

### 1) الإعداد
```bash
cd scripts
npm install
# ضع ملف serviceAccountKey.json هنا داخل scripts/ (حمّله من Firebase Console)
```

### 2) الترحيل
```bash
node excel_to_firestore.js ../data/students_template.xlsx
# أو استخدم مسار ملف الإكسل الخاص فيك
```

### ماذا يفعل السكربت؟
- يقرأ ورقتي **students** و **grades**.
- يجمّع درجات كل طالب في مصفوفة.
- ينشئ/يحدّث وثيقة `students/{nid}` بالحقول (name, class, total, notes, grades, updatedAt).

> آمن للتشغيل المتكرر: يعامل الطلبة حسب `nid` (تحديث دمجي).

---

## ملاحظات
- لتقليل صلاحيات العرض للطلاب، تستطيع تعديل القواعد لاحقًا بحيث القراءة مشروطة (مثلاً السماح بقراءة وثيقة الطالب فقط لو أرسل نفس nid).
- واجهة المشرف تتطلب تسجيل دخول بريدك فقط (حسب القواعد).
- أي مساعدة في تخصيص الأعمدة أو إضافة حقول للحضور — كلّمني.
