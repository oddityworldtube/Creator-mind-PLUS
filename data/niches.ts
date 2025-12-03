export interface Niche {
  id: string;
  name: string;
  rating?: number;
  category: string;
}

export const SUGGESTED_NICHES_WITH_RATINGS: Niche[] = [
  // Tech
  { id: 'tech_01', name: 'الذكاء الاصطناعي وتطبيقاته', rating: 97, category: 'tech' },
  { id: 'tech_02', name: 'التكنولوجيا ومراجعات الأجهزة', rating: 93, category: 'tech' },
  { id: 'tech_03', name: 'البرمجة وتطوير الويب', rating: 88, category: 'tech' },
  { id: 'tech_04', name: 'إصلاح الإلكترونيات والهواتف', rating: 85, category: 'tech' },
  { id: 'tech_05', name: 'الطائرات بدون طيار (Drones)', rating: 82, category: 'tech' },
  { id: 'tech_06', name: 'الطباعة ثلاثية الأبعاد', rating: 81, category: 'tech' },
  
  // General
  { id: 'gen_01', name: 'الألعاب (Gaming) وبث الألعاب', rating: 96, category: 'general' },
  { id: 'gen_02', name: 'صناعة المحتوى على يوتيوب', rating: 95, category: 'general' },
  { id: 'gen_03', name: 'التصوير الفوتوغرافي والفيديو', rating: 87, category: 'general' },
  { id: 'gen_04', name: 'تحليل الأخبار والأحداث الجارية', rating: 86, category: 'general' },
  { id: 'gen_05', name: 'السيارات ومراجعاتها', rating: 84, category: 'general' },
  { id: 'gen_06', name: 'الرسم والفنون الرقمية', rating: 83, category: 'general' },
  { id: 'gen_07', name: 'العزف على الآلات الموسيقية', rating: 81, category: 'general' },

  // Finance
  { id: 'fin_01', name: 'التمويل الشخصي والاستثمار', rating: 95, category: 'finance' },
  { id: 'fin_02', name: 'العملات الرقمية و NFT', rating: 91, category: 'finance' },
  { id: 'fin_03', name: 'العقارات والاستثمار العقاري', rating: 81, category: 'finance' },

  // Business
  { id: 'biz_01', name: 'التسويق الرقمي والتجارة الإلكترونية', rating: 94, category: 'business' },
  { id: 'biz_02', name: 'ريادة الأعمال والشركات الناشئة', rating: 93, category: 'business' },

  // Lifestyle
  { id: 'life_01', name: 'الطبخ والوصفات الصحية', rating: 92, category: 'lifestyle' },
  { id: 'life_02', name: 'اللياقة البدنية والتمارين المنزلية', rating: 91, category: 'lifestyle' },
  { id: 'life_03', name: 'العناية بالبشرة', rating: 90, category: 'lifestyle' },
  { id: 'life_04', name: 'السفر الاقتصادي والمغامرات', rating: 89, category: 'lifestyle' },
  { id: 'life_05', name: 'الموضة والجمال للنساء', rating: 89, category: 'lifestyle' },
  { id: 'life_06', name: 'الفلوقات اليومية (Vlogging)', rating: 88, category: 'lifestyle' },
  { id: 'life_07', name: 'التغذية وبناء العضلات', rating: 88, category: 'lifestyle' },
  { id: 'life_08', name: 'الأعمال اليدوية (DIY) وديكور المنزل', rating: 85, category: 'lifestyle' },
  { id: 'life_09', name: 'تربية الحيوانات الأليفة', rating: 85, category: 'lifestyle' },
  { id: 'life_10', name: 'الحياة البسيطة (Minimalism)', rating: 84, category: 'lifestyle' },
  { id: 'life_11', name: 'الطعام النباتي (Veganism)', rating: 83, category: 'lifestyle' },
  { id: 'life_12', name: 'الموضة والجمال للرجال', rating: 82, category: 'lifestyle' },
  { id: 'life_13', name: 'الأبوة والأمومة', rating: 80, category: 'lifestyle' },
  { id: 'life_14', name: 'التخييم والحياة في البرية', rating: 79, category: 'lifestyle' },
  { id: 'life_15', name: 'الرياضات الخطرة (Extreme Sports)', rating: 79, category: 'lifestyle' },
  { id: 'life_16', name: 'البستنة والزراعة المنزلية', rating: 78, category: 'lifestyle' },
  { id: 'life_17', name: 'الحرف اليدوية التقليدية', rating: 76, category: 'lifestyle' },

  // Education
  { id: 'edu_01', name: 'التعليم وتبسيط العلوم', rating: 92, category: 'education' },
  { id: 'edu_02', name: 'تعلم اللغات الجديدة', rating: 86, category: 'education' },
  { id: 'edu_03', name: 'مراجعات الكتب وملخصاتها', rating: 84, category: 'education' },

  // Entertainment
  { id: 'ent_01', name: 'مراجعات الأفلام والمسلسلات', rating: 90, category: 'entertainment' },
  { id: 'ent_02', name: 'اغرب 10', rating: 90, category: 'entertainment' },
  { id: 'ent_03', name: 'ردود الفعل على المحتوى الرائج', rating: 89, category: 'entertainment' },
  { id: 'ent_04', name: 'الكوميديا والمشاهد الساخرة', rating: 88, category: 'entertainment' },
  { id: 'ent_05', name: 'استعراض المنتجات الغريبة من الإنترنت', rating: 86, category: 'entertainment' },
  { id: 'ent_06', name: 'التجارب الاجتماعية', rating: 85, category: 'entertainment' },
  { id: 'ent_07', name: 'البودكاست المرئي', rating: 87, category: 'entertainment' },
  { id: 'ent_08', name: 'قصص الرعب والغموض', rating: 82, category: 'entertainment' },
  { id: 'ent_09', name: 'استكشاف الأماكن المهجورة', rating: 80, category: 'entertainment' },
  { id: 'ent_10', name: 'الخدع البصرية وتعليم السحر', rating: 77, category: 'entertainment' },

  // Sports
  { id: 'sport_01', name: 'تحليل مباريات كرة القدم', rating: 94, category: 'sports' },
  { id: 'sport_02', name: 'تحديات اللياقة البدنية', rating: 90, category: 'sports' },
  { id: 'sport_03', name: 'أخبار انتقالات اللاعبين', rating: 88, category: 'sports' },
  { id: 'sport_04', name: 'فورمولا 1 وسباق السيارات', rating: 85, category: 'sports' },
  { id: 'sport_05', name: 'تعليم الفنون القتالية', rating: 82, category: 'sports' },
  { id: 'sport_06', name: 'يوجا وتأمل للمبتدئين', rating: 80, category: 'sports' },
  
  // Psychology
  { id: 'psy_01', name: 'تطوير الذات والإنتاجية', rating: 94, category: 'psychology' },
  { id: 'psy_02', name: 'العلاقات العاطفية', rating: 92, category: 'psychology' },
  { id: 'psy_03', name: 'لغة الجسد', rating: 91, category: 'psychology' },
  { id: 'psy_04', name: 'علم النفس المظلم', rating: 89, category: 'psychology' },
  { id: 'psy_05', name: 'تحليل الشخصيات', rating: 88, category: 'psychology' },
  { id: 'psy_06', name: 'الصحة النفسية والتأمل', rating: 87, category: 'psychology' },
  { id: 'psy_07', name: 'الاضطرابات النفسية', rating: 85, category: 'psychology' },
  
  // Documentary & History
  { id: 'doc_01', name: 'حضارات', rating: 92, category: 'documentary' },
  { id: 'doc_02', name: 'شخصيات تاريخية', rating: 91, category: 'documentary' },
  { id: 'doc_03', name: 'شخصيات إسلامية تاريخية', rating: 89, category: 'documentary' },
  { id: 'doc_04', name: 'أسرار الحضارات القديمة', rating: 90, category: 'documentary' },
  { id: 'doc_05', name: 'اكتشافات علمية غيرت العالم', rating: 89, category: 'documentary' },
  { id: 'doc_06', name: 'ألغاز لم تُحل', rating: 88, category: 'documentary' },
  { id: 'doc_07', name: 'المعلومات التاريخية', rating: 87, category: 'documentary' },
  { id: 'doc_08', name: 'قصص حروب تاريخية', rating: 87, category: 'documentary' },
  { id: 'doc_09', name: 'التاريخ', rating: 86, category: 'documentary' },
  { id: 'doc_10', name: 'سير ذاتية لشخصيات مؤثرة', rating: 86, category: 'documentary' },
  { id: 'doc_11', name: 'الوثائقيات', rating: 86, category: 'documentary' },
];

export const NICHE_CATEGORIES: Record<string, string> = {
    'psychology': 'علم النفس وتحليل الشخصيات',
    'documentary': 'وثائقي، تاريخي واكتشافات',
    'tech': 'تكنولوجيا وتقنية',
    'lifestyle': 'أسلوب حياة',
    'finance': 'تمويل واستثمار',
    'business': 'أعمال وتسويق',
    'entertainment': 'ترفيه',
    'education': 'تعليم',
    'sports': 'رياضة',
    'general': 'متنوع',
};