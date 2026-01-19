/**
 * Prompt Service
 *
 * Prompt yönetimi için servis katmanı.
 * Caching ile performans optimizasyonu.
 */

import { Prompt, IPrompt } from "../models/Prompt";

// In-memory cache for prompts (5 dakika TTL)
const promptCache = new Map<string, { prompt: IPrompt; cachedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Cache'den prompt al veya DB'den çek
 */
export async function getPrompt(key: string): Promise<IPrompt | null> {
  // Check cache
  const cached = promptCache.get(key);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return cached.prompt;
  }

  // Fetch from DB
  const prompt = await Prompt.findOne({ key, isActive: true }).lean();
  if (prompt) {
    promptCache.set(key, { prompt: prompt as IPrompt, cachedAt: Date.now() });
  }

  return prompt as IPrompt | null;
}

/**
 * Prompt içeriğini değişkenlerle birleştir
 */
export async function getPromptWithVariables(
  key: string,
  variables: Record<string, string> = {}
): Promise<string | null> {
  const prompt = await getPrompt(key);
  if (!prompt) return null;

  let content = prompt.content;

  // Replace variables
  for (const [varName, varValue] of Object.entries(variables)) {
    content = content.replace(new RegExp(`{{${varName}}}`, "g"), varValue);
  }

  return content;
}

/**
 * Kategori bazlı promptları getir
 */
export async function getPromptsByCategory(
  category: IPrompt["category"]
): Promise<IPrompt[]> {
  const prompts = await Prompt.find({ category, isActive: true })
    .sort({ createdAt: -1 })
    .lean();
  return prompts as IPrompt[];
}

/**
 * Tüm promptları getir (admin için)
 */
export async function getAllPrompts(): Promise<IPrompt[]> {
  const prompts = await Prompt.find().sort({ category: 1, key: 1 }).lean();
  return prompts as IPrompt[];
}

/**
 * Prompt oluştur veya güncelle
 */
export async function upsertPrompt(
  key: string,
  data: Partial<IPrompt>
): Promise<IPrompt> {
  const existing = await Prompt.findOne({ key });

  if (existing) {
    // Update
    const updated = await Prompt.findOneAndUpdate(
      { key },
      {
        ...data,
        version: existing.version + 1,
      },
      { new: true }
    ).lean();

    // Clear cache
    promptCache.delete(key);

    return updated as IPrompt;
  }

  // Create
  const prompt = await Prompt.create({
    key,
    ...data,
    version: 1,
  });

  return prompt.toObject() as IPrompt;
}

/**
 * Prompt sil
 */
export async function deletePrompt(key: string): Promise<boolean> {
  const result = await Prompt.deleteOne({ key });
  promptCache.delete(key);
  return result.deletedCount > 0;
}

/**
 * Cache'i temizle
 */
export function clearPromptCache(): void {
  promptCache.clear();
}

/**
 * Varsayılan promptları yükle (seed)
 */
export async function seedDefaultPrompts(): Promise<void> {
  const defaultPrompts: Partial<IPrompt>[] = [
    {
      key: "mira_system",
      name: "Mira System Prompt",
      category: "system",
      description: "Ana chatbot karakteri ve davranış kuralları",
      variables: [],
      content: `Sen "Mira" - Blue Perfumery'nin koku danışmanısın. 28 yaşında, parfüm tutkunu, samimi ve güler yüzlü bir uzman gibi davran.

## 🎭 KİŞİLİĞİN
- Arkadaş canlısı, içten ve samimi
- Meraklı - müşteriyi gerçekten tanımak istiyorsun
- Empati kuran - duyguları anlıyor ve yansıtıyorsun
- Tutkulu - parfümlerden bahsederken gözlerin parlıyor
- Profesyonel ama asla soğuk değil

## 💬 KONUŞMA TARZI
- "Sen" hitabı kullan, samimi ol
- Kısa, akıcı cümleler (2-3 cümle max)
- Her mesajda 1 emoji yeterli
- Doğal geçişler: "Harika!", "Süper!", "Çok güzel!"
- Soru sorarken merak et, sorgu yapma

## 🎯 SATIŞ TEKNİKLERİ (doğal şekilde kullan)
- **Hikaye anlat**: "Bu kokuyu sürdüğünde sanki..."
- **Sosyal kanıt**: "Bu hafta en çok tercih edilen..."
- **Fayda vurgula**: "Uzun süre kalıcı, gün boyu seninle"
- **Bağlantı kur**: "Senin tarzına çok yakışır"
- **Merak uyandır**: "Bir de şunu denemelisin..."

## ⚠️ KRİTİK KURALLAR
1. SADECE veritabanındaki notaları söyle - ASLA uydurma!
2. "Notalar: Belirtilmemiş" ise nota bilgisi verme
3. Aynı soruyu iki kez sorma - bağlamı hatırla
4. Müşteri yerine konuşma veya roleplay yapma`,
    },
    {
      key: "greeting_welcome",
      name: "Karşılama Mesajı",
      category: "greeting",
      description: "Chat açıldığında ilk mesaj",
      content:
        "Merhaba! 💫 Ben Mira, Blue Perfumery'nin koku danışmanı. Sana özel bir parfüm bulmama yardım etmemi ister misin?",
    },
    {
      key: "greeting_responses",
      name: "Selamlama Yanıtları",
      category: "greeting",
      description: "Kullanıcı selam verdiğinde",
      content: JSON.stringify([
        "Merhaba! 💫 Blue Perfumery'ye hoş geldin! Sana nasıl yardımcı olabilirim?",
        "Selam! ✨ Bugün sana harika kokular önerebilirim. Kendine mi hediye mi arıyorsun?",
        "Hey! 🌸 Hoş geldin! Parfüm dünyasında sana rehberlik etmeme izin verir misin?",
      ]),
    },
    {
      key: "sales_closing",
      name: "Satış Kapama Cümleleri",
      category: "sales",
      description: "Öneri sonrası kapanış",
      content: JSON.stringify([
        "Bu hafta en çok tercih edilen kokulardan! Hangisini denemek istersin?",
        "Bunlar senin tarzına çok yakışır. Hangisi dikkatini çekti?",
        "Her biri kalıcılığıyla dikkat çekiyor. Birini daha yakından inceleyelim mi?",
        "Sana özel seçtim! Hangisi hakkında daha fazla bilgi vereyim?",
      ]),
    },
    {
      key: "profiling_gender",
      name: "Cinsiyet Sorusu",
      category: "profiling",
      description: "Cinsiyet profilleme",
      content: JSON.stringify([
        "Parfümü kendin için mi arıyorsun yoksa sevdiklerine hediye mi? 🎁",
        "Öncelikle şunu sorayım - parfümü erkek mi kadın mı kullanacak? 😊",
      ]),
    },
    {
      key: "profiling_occasion",
      name: "Kullanım Ortamı",
      category: "profiling",
      description: "Kullanım ortamı profilleme",
      content: JSON.stringify([
        "Parfümü hangi ortamlarda kullanmayı düşünüyorsun? Günlük mi, özel anlar için mi? ✨",
        "Ne tür ortamlarda kullanmak istersin? İş, günlük, gece çıkışları? 🌙",
      ]),
    },
    {
      key: "error_general",
      name: "Genel Hata Mesajı",
      category: "error",
      description: "Beklenmeyen hata durumu",
      content:
        "Üzgünüm, şu an yanıt veremiyorum. Birazdan tekrar dener misin? 💫",
    },
    {
      key: "off_topic",
      name: "Konu Dışı Yönlendirme",
      category: "custom",
      description: "Parfüm dışı sorulara yanıt",
      content: JSON.stringify([
        "Ah, keşke bu konuda da uzman olsam! 😊 Ama benim tutkum kokular. Şimdi sana özel bir şey bulalım mı?",
        "Güzel bir soru! Ben parfüm dünyasının uzmanıyım. Sana harika bir koku önerebilir miyim?",
      ]),
    },
  ];

  for (const prompt of defaultPrompts) {
    const existing = await Prompt.findOne({ key: prompt.key });
    if (!existing) {
      await Prompt.create({ ...prompt, isActive: true });
      console.log(`✅ Prompt oluşturuldu: ${prompt.key}`);
    }
  }
}
