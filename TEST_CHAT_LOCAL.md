# Local Chat Bot Test Rehberi

## Önkoşullar

1. **Backend çalışıyor olmalı:**
   ```bash
   cd blueperfumery-backend
   npm run dev
   ```

2. **Environment Variables (.env dosyası):**
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/blueperfumery
   ANTHROPIC_API_KEY=your-api-key-here
   ```

## Test Etme

### 1. Manuel Test (curl)

```bash
curl -X POST 'http://localhost:5000/api/agent/chat' \
  -H 'Content-Type: application/json' \
  --data-raw '{"message":"Erkek parfümü öner"}'
```

### 2. Test Script Kullanma

```bash
cd blueperfumery-backend
./test-chat-local.sh
```

## Olası Hatalar ve Çözümler

### 1. `AI_SERVICE_UNAVAILABLE` (503)
**Sebep:** `ANTHROPIC_API_KEY` eksik veya geçersiz
**Çözüm:** `.env` dosyasında `ANTHROPIC_API_KEY` değerini kontrol edin

### 2. `MongoDB Connection Error`
**Sebep:** MongoDB çalışmıyor veya bağlantı string'i yanlış
**Çözüm:** MongoDB'nin çalıştığından emin olun ve `MONGODB_URI`'yi kontrol edin

### 3. `400 Bad Request`
**Sebep:** Mesaj eksik veya çok uzun
**Çözüm:** Mesajın 1-500 karakter arasında olduğundan emin olun

### 4. `429 Too Many Requests`
**Sebep:** Rate limit aşıldı (dakikada 10 istek)
**Çözüm:** Biraz bekleyin veya rate limit'i artırın

## Debug İpuçları

Backend loglarında şunları göreceksiniz:
- `📨 Chat request received` - İstek alındı
- `🔍 Request validation` - Validasyon yapılıyor
- `🤖 Getting Librarian Agent` - Agent oluşturuluyor
- `💬 Calling askAboutPerfume` - AI'ya soru soruluyor
- `✅ Chat response generated` - Başarılı yanıt
- `❌ Agent chat error` - Hata oluştu

## Test Senaryoları

1. **Başarılı istek:**
   ```json
   {"message":"Erkek parfümü öner"}
   ```

2. **Boş mesaj (400 beklenir):**
   ```json
   {"message":""}
   ```

3. **Çok uzun mesaj (400 beklenir):**
   ```json
   {"message":"a".repeat(600)}
   ```

4. **Parfüm ID ile:**
   ```json
   {"message":"Bu parfüm hakkında bilgi ver", "perfumeId":"some-id"}
   ```
