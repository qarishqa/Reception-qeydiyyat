# Testing Guide

## 🚀 Local Development Setup

### 1. Dependencies Install
```bash
npm install
```

### 2. Environment Variables
`.env` faylında Supabase konfiqurasiyası olmalıdır:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### 3. Start Development Server
```bash
npm run dev
```

Server **http://localhost:8080** ünvanında işləyəcək.

---

## ✅ Test Edilməli Funksionallıqlar

### 1. Soft Delete Mexanizmi
- [ ] Müştəri silmə funksionallığı
- [ ] Silinmiş müştərilərin siyahıda görünməməsi
- [ ] Dashboard statistikalarında silinmiş müştərilərin sayılmaması
- [ ] Analytics-də silinmiş müştərilərin filterlənməsi

**Test addımları:**
1. Dashboard-a giriş edin
2. Müştəri siyahısına gedin
3. Bir müştəri silin
4. Siyahıda görünmədiyini yoxlayın
5. Dashboard statistikalarını yoxlayın (sayı dəyişməlidir)

### 2. Pagination
- [ ] Müştəri siyahısında pagination işləyir
- [ ] Hər səhifədə 20 müştəri göstərilir
- [ ] Səhifə dəyişdirmə düzgün işləyir
- [ ] Filter dəyişdikdə səhifə reset olunur

**Test addımları:**
1. Müştəri siyahısına gedin
2. 20-dən çox müştəri varsa, pagination görünməlidir
3. Səhifə dəyişdirin
4. Filter tətbiq edin - səhifə 1-ə qayıtmalıdır

### 3. Error Handling
- [ ] Network xətaları user-friendly mesajlarla göstərilir
- [ ] Authentication xətaları düzgün handle olunur
- [ ] Database xətaları user-friendly mesajlarla göstərilir
- [ ] Error logging işləyir (console-da görünür)

**Test addımları:**
1. İnternet bağlantısını kəsin və bir əməliyyat edin
2. Yanlış şifrə ilə giriş edin
3. Mövcud olmayan müştəri silməyə cəhd edin
4. Console-da error log-ları yoxlayın

### 4. Müştəri İdarəçiliyi
- [ ] Yeni müştəri əlavə etmə
- [ ] Müştəri redaktə etmə
- [ ] Telefon nömrəsi ilə axtarış
- [ ] Filter və axtarış funksionallığı

**Test addımları:**
1. Yeni müştəri əlavə edin
2. Telefon nömrəsi ilə axtarış edin
3. Müştəri məlumatlarını redaktə edin
4. Filter tətbiq edin

### 5. Analytics
- [ ] Analitika məlumatları yüklənir
- [ ] Chart-lar düzgün göstərilir
- [ ] Drill-down funksionallığı işləyir
- [ ] Time range filter işləyir

**Test addımları:**
1. Analytics səhifəsinə gedin
2. Chart-lara baxın
3. Bir chart-a klikləyin (drill-down)
4. Time range dəyişdirin

---

## 🐛 Bilinən Problemlər

1. **Migration apply edilməyib** - Soft delete üçün migration apply etmək lazımdır
2. **TypeScript types** - Migration-dan sonra types yenidən generate etmək tövsiyə olunur

---

## 📝 Test Nəticələri

Test edildikdə bu bölməni doldurun:

### Test Tarixi: _______________

#### Soft Delete
- [ ] Test edildi
- [ ] Problem var: _______________

#### Pagination
- [ ] Test edildi
- [ ] Problem var: _______________

#### Error Handling
- [ ] Test edildi
- [ ] Problem var: _______________

#### Müştəri İdarəçiliyi
- [ ] Test edildi
- [ ] Problem var: _______________

#### Analytics
- [ ] Test edildi
- [ ] Problem var: _______________

---

## 🔧 Troubleshooting

### Server başlamır
```bash
# Port yoxlanışı
lsof -ti:8080

# Əgər port istifadə olunursa, process-i dayandırın
kill -9 $(lsof -ti:8080)

# Yenidən başladın
npm run dev
```

### Dependencies problemi
```bash
# node_modules silin
rm -rf node_modules package-lock.json

# Yenidən install edin
npm install
```

### Supabase bağlantı problemi
- `.env` faylında düzgün credentials olduğunu yoxlayın
- Supabase dashboard-da project-in aktiv olduğunu yoxlayın

