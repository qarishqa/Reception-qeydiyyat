# Customers Table Schema

## 📋 Bütün Column-lar

### Primary Key
- **id** (UUID, PRIMARY KEY) - Müştərinin unikal identifikatoru

### Mütləq Sahələr (NOT NULL)
- **phone** (TEXT, NOT NULL, UNIQUE) - Telefon nömrəsi (unikal)
- **full_name** (TEXT, NOT NULL) - Ad və soyad
- **created_by** (UUID, NOT NULL) - Müştəri yaradan istifadəçinin ID-si (auth.users-a reference)

### Məlumat Sahələri (Nullable)
- **email** (TEXT, NULL) - E-poçt ünvanı
- **age_group** (TEXT, NULL) - Yaş qrupu
- **gender** (TEXT, NULL) - Cins
- **interested_model** (TEXT, NULL) - Maraqlanan model
- **ad_source** (TEXT, NULL) - Reklam mənbəsi (məsələn: "Sosial media", "TV", "Radio")
- **social_media_platform** (TEXT, NULL) - Sosial media platforması (məsələn: "Instagram", "Facebook", "TikTok") - **YENİ**
- **salon** (TEXT, NULL) - Salon adı
- **sales_manager** (TEXT, NULL) - Satış meneceri
- **notes** (TEXT, NULL) - Əlavə qeydlər

### Status Sahələri
- **status** (customer_status ENUM, NULL, DEFAULT: 'new_inquiry')
  - Mümkün dəyərlər:
    - `'new_inquiry'` - Yeni sorğu
    - `'test_drive_scheduled'` - Test sürüşü planlaşdırılıb
    - `'negotiating'` - Danışıqlar aparılır
    - `'sold'` - Satılıb
    - `'lost'` - İtirilib

### Soft Delete Sahələri
- **is_deleted** (BOOLEAN, NOT NULL, DEFAULT: FALSE) - Soft delete flag
- **deleted_at** (TIMESTAMP WITH TIME ZONE, NULL) - Silinmə tarixi

### Timestamp Sahələri
- **created_at** (TIMESTAMP WITH TIME ZONE, NULL, DEFAULT: NOW()) - Yaradılma tarixi
- **updated_at** (TIMESTAMP WITH TIME ZONE, NULL, DEFAULT: NOW()) - Yenilənmə tarixi

---

## 📊 Cədvəl Strukturu

```sql
CREATE TABLE public.customers (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Mütləq Sahələr
  phone TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Məlumat Sahələri
  email TEXT,
  age_group TEXT,
  gender TEXT,
  interested_model TEXT,
  ad_source TEXT,
  social_media_platform TEXT,  -- YENİ
  salon TEXT,
  sales_manager TEXT,
  notes TEXT,
  
  -- Status
  status customer_status DEFAULT 'new_inquiry',
  
  -- Soft Delete
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔍 Index-lər

1. **idx_customers_is_deleted** - `is_deleted` column üzrə
2. **idx_customers_deleted_at** - `deleted_at` column üzrə
3. **idx_customers_salon** - `salon` column üzrə
4. **idx_customers_sales_manager** - `sales_manager` column üzrə
5. **idx_customers_social_media_platform** - `social_media_platform` column üzrə (YENİ)

---

## 📝 Qeydlər

- **phone** column-u UNIQUE constraint-ə malikdir (hər telefon nömrəsi yalnız bir dəfə ola bilər)
- **created_by** column-u `auth.users` table-ına foreign key-dir
- **status** column-u ENUM type-dır və müəyyən dəyərləri qəbul edir
- **is_deleted** və **deleted_at** column-ları soft delete mexanizmi üçündür
- **social_media_platform** column-u yeni əlavə edilmişdir və migration apply edilməlidir

---

## 🔄 Migration Tarixçəsi

1. **20250830072118** - İlkin customers table yaradıldı
2. **20250115000000** - `salon` və `sales_manager` column-ları əlavə edildi
3. **20250117000000** - `is_deleted` və `deleted_at` column-ları əlavə edildi (soft delete)
4. **20250117000001** - `social_media_platform` column-u əlavə edildi (YENİ)

---

## ✅ Migration Apply Etmək

Əgər `social_media_platform` column-u hələ DB-də yoxdursa, bu SQL-i çalıştırın:

```sql
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS social_media_platform TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_social_media_platform 
ON public.customers(social_media_platform);

COMMENT ON COLUMN public.customers.social_media_platform IS 
'Specific social media platform (Instagram, Facebook, TikTok, etc.) when ad_source is "Sosial media"';
```

