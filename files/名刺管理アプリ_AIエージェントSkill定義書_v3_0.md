# 名刺管理アプリ AIエージェント Skill定義書

**作成日:** 2025年1月17日  
**バージョン:** 3.0  
**最終更新日:** 2026年1月21日

---

## 目次

1. [概要](#1-概要)
2. [Skill一覧](#2-skill一覧)
3. [Skill詳細定義](#3-skill詳細定義)
4. [Skill連携フロー](#4-skill連携フロー)
5. [エラーハンドリング](#5-エラーハンドリング)
6. [設定・APIキー管理](#6-設定apiキー管理)

---

## 1. 概要

### 1.1 目的

本ドキュメントは、名刺管理アプリにおけるAIエージェント機能のSkill（スキル）を定義する。各Skillは独立したモジュールとして実装され、組み合わせて利用される。

### 1.2 設計方針

| 方針 | 説明 |
|------|------|
| 単一責任 | 各Skillは1つの明確な責務を持つ |
| 疎結合 | Skill間の依存を最小化し、差し替え可能にする |
| フォールバック | 外部API障害時はローカル処理にフォールバック |
| プライバシー配慮 | 外部送信データは必要最小限に |

### 1.3 Skillアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    Skill Orchestrator                       │
│                  （スキル統合・制御層）                        │
└─────────────────────────────────────────────────────────────┘
        │           │           │           │           │
        ▼           ▼           ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  OCR    │ │ 構造化  │ │ 重複    │ │ 検索    │ │ 補完    │
│ Skill   │ │ Skill   │ │ 判定    │ │ Skill   │ │ Skill   │
│         │ │         │ │ Skill   │ │         │ │         │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
     │           │           │           │           │
     ▼           ▼           ▼           ▼           ▼
┌─────────────────────────────────────────────────────────────┐
│                    External API Layer                       │
│     Google Vision │ Claude API │ 法人番号API │ etc.         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Skill一覧

| Skill ID | Skill名 | 優先度 | 外部API | 説明 |
|----------|---------|--------|---------|------|
| SK-001 | OCR Skill | 必須 | Google Gemini API | 名刺画像からテキスト抽出・構造化 (Multimodal LLM) |
| SK-002 | 構造化 Skill | 必須 | (SK-001に統合) | OCR結果の補正・正規化 (SK-001で代替可能) |
| SK-003 | 重複判定 Skill | 必須 | Claude API / Gemini | 名刺の重複・同一人物判定 |
| SK-004 | 自然言語検索 Skill | 推奨 | Claude API / Gemini | 自然言語での名刺検索 |
| SK-005 | 会社情報補完 Skill | 推奨 | 法人番号API | 会社情報の自動補完 |
| SK-006 | タグ提案 Skill | オプション | Claude API / Gemini | 名刺内容に基づくタグ提案 |
| SK-007 | 優先度推定 Skill | オプション | Claude API / Gemini | 優先度の自動推定 |
| SK-008 | 画像前処理 Skill | 必須 | なし（ローカル） | 画像の正規化・最適化 |

---

## 3. Skill詳細定義

### 3.1 SK-001: OCR Skill

#### 基本情報

```yaml
id: SK-001
name: OCR Skill
version: 1.0.0
description: 名刺画像から文字情報を抽出する
category: 画像認識
priority: required
```

#### インターフェース

```typescript
interface OCRSkillInput {
  /** 名刺画像データ（Base64 or Blob） */
  image: string | Blob;
  /** 画像形式 */
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  /** 認識言語リスト */
  languages?: ('ja' | 'en' | 'zh' | 'ko')[];
  /** 処理モード */
  mode?: 'cloud' | 'local' | 'auto';
}

interface OCRSkillOutput {
  /** 抽出されたテキスト全体 */
  fullText: string;
  /** テキストブロック情報 */
  blocks: TextBlock[];
  /** 認識信頼度（0-1） */
  confidence: number;
  /** 使用した処理モード */
  usedMode: 'cloud' | 'local';
  /** 処理時間（ms） */
  processingTime: number;
}

interface TextBlock {
  /** テキスト内容 */
  text: string;
  /** バウンディングボックス */
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** ブロック信頼度 */
  confidence: number;
}
```

#### 処理フロー

```
入力画像
    │
    ▼
┌─────────────────┐
│ 画像前処理       │ ← SK-008呼び出し
│ (リサイズ、圧縮) │
└─────────────────┘
    │
    ▼
┌─────────────────┐     失敗
│ Cloud Vision    │ ──────────┐
│ API呼び出し     │           │
└─────────────────┘           │
    │成功                      ▼
    │              ┌─────────────────┐
    │              │ Tesseract.js    │
    │              │ ローカルOCR     │
    │              └─────────────────┘
    │                         │
    ▼                         ▼
┌─────────────────────────────────┐
│ 結果正規化・TextBlock生成        │
└─────────────────────────────────┘
    │
    ▼
出力（OCRSkillOutput）
```

#### API呼び出し仕様

**Google Cloud Vision API**

```typescript
const callCloudVision = async (
  imageBase64: string,
  apiKey: string
): Promise<VisionResponse> => {
  const response = await axios.post(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      requests: [{
        image: { content: imageBase64 },
        features: [
          { type: 'TEXT_DETECTION' },
          { type: 'DOCUMENT_TEXT_DETECTION' }
        ],
        imageContext: {
          languageHints: ['ja', 'en']
        }
      }]
    }
  );
  return response.data;
};
```

#### エラーハンドリング

| エラーコード | 原因 | 対応 |
|--------------|------|------|
| OCR_API_AUTH_ERROR | APIキー無効 | 設定画面へ誘導 |
| OCR_API_QUOTA_ERROR | API利用制限 | ローカルOCRへフォールバック |
| OCR_API_TIMEOUT | タイムアウト | リトライ後、ローカルへフォールバック |
| OCR_LOCAL_FAILED | ローカルOCR失敗 | 手動入力を促す |
| OCR_NO_TEXT | テキスト検出なし | 画像再撮影を促す |

---

### 3.2 SK-002: 構造化 Skill

#### 基本情報

```yaml
id: SK-002
name: 構造化 Skill
version: 1.0.0
description: OCR結果テキストを名刺の構造化データに変換する
category: 自然言語処理
priority: required
dependencies:
  - SK-001 (OCR Skill)
```

#### インターフェース

```typescript
interface StructureSkillInput {
  /** OCR抽出テキスト */
  ocrText: string;
  /** テキストブロック情報（位置情報含む） */
  textBlocks?: TextBlock[];
  /** 追加コンテキスト */
  context?: {
    /** 既存の会社名リスト（補完用） */
    existingCompanies?: string[];
    /** 既存の人名リスト（補完用） */
    existingNames?: string[];
  };
}

interface StructureSkillOutput {
  /** 構造化された名刺データ */
  data: BusinessCardData;
  /** 各フィールドの信頼度 */
  fieldConfidence: Record<string, number>;
  /** 構造化に使用したモデル */
  model: string;
  /** 処理時間（ms） */
  processingTime: number;
}

interface BusinessCardData {
  personName: string | null;
  personNameKana: string | null;
  companyName: string | null;
  department: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  fax: string | null;
  address: string | null;
  postalCode: string | null;
  website: string | null;
  positionLevel: PositionLevel | null;
  industry: Industry | null;
}

type PositionLevel = 
  | 'EXECUTIVE' 
  | 'DIRECTOR' 
  | 'MANAGER' 
  | 'SECTION_CHIEF' 
  | 'STAFF' 
  | 'OTHER';

type Industry = 
  | 'IT' 
  | 'FINANCE' 
  | 'MANUFACTURING' 
  | 'RETAIL' 
  | 'SERVICE' 
  | 'CONSTRUCTION' 
  | 'MEDICAL' 
  | 'EDUCATION' 
  | 'GOVERNMENT' 
  | 'OTHER';
```

#### LLMプロンプト

```typescript
const STRUCTURE_PROMPT = `
あなたは名刺情報を構造化するエキスパートです。
以下のOCRテキストから名刺情報を抽出し、JSON形式で出力してください。

## 入力テキスト
{ocr_text}

## 出力形式
必ず以下のJSON形式で出力してください。不明な項目はnullとしてください。

\`\`\`json
{
  "personName": "氏名（姓と名の間にスペース）",
  "personNameKana": "フリガナ（推測、なければnull）",
  "companyName": "会社名（株式会社等を正規化）",
  "department": "部署名",
  "position": "役職名",
  "email": "メールアドレス",
  "phone": "電話番号（ハイフン区切りで正規化）",
  "mobile": "携帯番号",
  "fax": "FAX番号",
  "address": "住所",
  "postalCode": "郵便番号（〒なし、ハイフンあり）",
  "website": "WebサイトURL",
  "positionLevel": "EXECUTIVE|DIRECTOR|MANAGER|SECTION_CHIEF|STAFF|OTHER",
  "industry": "IT|FINANCE|MANUFACTURING|RETAIL|SERVICE|CONSTRUCTION|MEDICAL|EDUCATION|GOVERNMENT|OTHER"
}
\`\`\`

## 処理ルール
1. 会社名は「株式会社」「(株)」「㈱」を「株式会社」に統一
2. 電話番号は「03-1234-5678」形式に正規化
3. 役職レベルは以下で判断:
   - EXECUTIVE: 代表取締役、社長、CEO、会長
   - DIRECTOR: 取締役、執行役員、CFO、CTO
   - MANAGER: 部長、本部長、ディレクター、ゼネラルマネージャー
   - SECTION_CHIEF: 課長、マネージャー、チームリーダー
   - STAFF: 担当、主任、一般
   - OTHER: 顧問、フリーランス、その他
4. 業種は会社名・部署名から推測（不明ならnull）
`;
```

#### Claude API呼び出し

```typescript
const callClaude = async (
  prompt: string,
  apiKey: string
): Promise<ClaudeResponse> => {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    }
  );
  return response.data;
};
```

#### フォールバック処理

LLM APIが利用できない場合の正規表現ベース抽出：

```typescript
const fallbackExtraction = (text: string): Partial<BusinessCardData> => {
  return {
    email: text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || null,
    phone: text.match(/0\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{3,4}/)?.[0] || null,
    mobile: text.match(/0[789]0[-.\s]?\d{4}[-.\s]?\d{4}/)?.[0] || null,
    fax: text.match(/0\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{3,4}/)?.[0] || null, // 本来はphoneと区別が難しいが例として
    postalCode: text.match(/\d{3}[-]?\d{4}/)?.[0] || null,
    website: text.match(/https?:\/\/[^\s]+/)?.[0] || null,
    // 氏名、会社名等は正規表現では困難なためnull
    personName: null,
    companyName: null,
  };
};
```

---

### 3.3 SK-003: 重複判定 Skill

#### 基本情報

```yaml
id: SK-003
name: 重複判定 Skill
version: 1.0.0
description: 2つの名刺が同一人物かどうかを判定する
category: 類似度判定
priority: required
```

#### インターフェース

```typescript
interface DuplicateCheckInput {
  /** 判定対象の名刺 */
  card1: BusinessCard;
  /** 比較対象の名刺 */
  card2: BusinessCard;
  /** 判定モード */
  mode?: 'strict' | 'loose' | 'auto';
}

interface DuplicateCheckOutput {
  /** 同一人物である確率（0-1） */
  probability: number;
  /** 判定結果 */
  isDuplicate: boolean;
  /** 判定理由 */
  reasons: DuplicateReason[];
  /** 統合時の推奨データ */
  mergeRecommendation?: MergeRecommendation;
}

interface DuplicateReason {
  /** 判定要因 */
  factor: 'email' | 'name' | 'phone' | 'company' | 'combined';
  /** 重み */
  weight: number;
  /** 詳細説明 */
  description: string;
}

interface MergeRecommendation {
  /** 各フィールドで推奨される値のソース */
  fieldSources: Record<keyof BusinessCard, 'card1' | 'card2' | 'both'>;
  /** 推奨理由 */
  reasoning: string;
}
```

#### 判定ロジック

```typescript
const checkDuplicate = async (
  input: DuplicateCheckInput,
  settings: SkillSettings
): Promise<DuplicateCheckOutput> => {
  const { card1, card2 } = input;
  const reasons: DuplicateReason[] = [];
  let totalScore = 0;

  // 1. メールアドレス完全一致（高信頼度）
  if (card1.email && card2.email && 
      normalizeEmail(card1.email) === normalizeEmail(card2.email)) {
    reasons.push({
      factor: 'email',
      weight: 0.5,
      description: 'メールアドレスが一致'
    });
    totalScore += 0.5;
  }

  // 2. 電話番号一致（中信頼度）
  if (card1.phone && card2.phone && 
      normalizePhone(card1.phone) === normalizePhone(card2.phone)) {
    reasons.push({
      factor: 'phone',
      weight: 0.3,
      description: '電話番号が一致'
    });
    totalScore += 0.3;
  }

  // 3. 氏名＋会社名一致（高信頼度）
  if (card1.personName && card2.personName && card1.companyName && card2.companyName) {
    const nameSimilarity = calculateSimilarity(card1.personName, card2.personName);
    const companySimilarity = calculateSimilarity(card1.companyName, card2.companyName);
    
    if (nameSimilarity > 0.9 && companySimilarity > 0.9) {
      reasons.push({
        factor: 'combined',
        weight: 0.4,
        description: '氏名と会社名が一致'
      });
      totalScore += 0.4;
    }
  }

  // 4. LLMによる高度な判定（オプション）
  if (settings.enableLlmDuplicateCheck && totalScore >= 0.3 && totalScore < 0.7) {
    const llmResult = await llmDuplicateCheck(card1, card2, settings.llmApiKey);
    totalScore = (totalScore + llmResult.probability) / 2;
    reasons.push(...llmResult.reasons);
  }

  return {
    probability: Math.min(totalScore, 1.0),
    isDuplicate: totalScore >= 0.7,
    reasons,
    mergeRecommendation: totalScore >= 0.7 
      ? generateMergeRecommendation(card1, card2) 
      : undefined
  };
};
```

#### LLM重複判定プロンプト

```typescript
const DUPLICATE_CHECK_PROMPT = `
以下の2つの名刺情報が同一人物のものかどうかを判定してください。

## 名刺1
氏名: {card1.personName}
会社: {card1.companyName}
部署: {card1.department}
役職: {card1.position}
メール: {card1.email}
電話: {card1.phone}

## 名刺2
氏名: {card2.personName}
会社: {card2.companyName}
部署: {card2.department}
役職: {card2.position}
メール: {card2.email}
電話: {card2.phone}

## 判定基準
- 転職している可能性を考慮（会社が違っても同一人物の可能性あり）
- 部署異動の可能性を考慮
- 旧姓使用の可能性を考慮
- 表記揺れを考慮（株式会社↔(株)、ー↔−など）

## 出力形式
\`\`\`json
{
  "probability": 0.0-1.0,
  "reasoning": "判定理由の説明",
  "factors": [
    {"factor": "要因名", "contribution": 0.0-1.0, "description": "説明"}
  ]
}
\`\`\`
`;
```

---

### 3.4 SK-004: 自然言語検索 Skill

#### 基本情報

```yaml
id: SK-004
name: 自然言語検索 Skill
version: 1.0.0
description: 自然言語のクエリを検索条件に変換する
category: 自然言語処理
priority: recommended
```

#### インターフェース

```typescript
interface NLSearchInput {
  /** 自然言語クエリ */
  query: string;
  /** 検索対象の名刺リスト（メタデータのみ） */
  cardMetadata?: CardMetadata[];
  /** ユーザーの所属情報 */
  userProfiles?: MyProfile[];
}

interface NLSearchOutput {
  /** 変換された検索条件 */
  filters: SearchFilters;
  /** クエリの解釈結果 */
  interpretation: QueryInterpretation;
  /** 検索結果（cardMetadataが提供された場合） */
  matchedCardIds?: string[];
}

interface SearchFilters {
  keyword?: string;
  profileIds?: string[];
  priority?: number[];
  tagIds?: string[];
  industries?: Industry[];
  areas?: string[];
  positionLevels?: PositionLevel[];
  exchangeDateFrom?: Date;
  exchangeDateTo?: Date;
}

interface QueryInterpretation {
  /** 抽出された時間表現 */
  timeExpression?: {
    original: string;
    resolved: { from?: Date; to?: Date };
  };
  /** 抽出された属性 */
  attributes: {
    type: 'industry' | 'area' | 'position' | 'company' | 'name' | 'tag';
    value: string;
    confidence: number;
  }[];
  /** 解釈の説明 */
  explanation: string;
}
```

#### 処理例

```typescript
// 入力例: "先月会ったIT企業の部長クラスの人"

// 出力例:
{
  filters: {
    industries: ['IT'],
    positionLevels: ['MANAGER', 'DIRECTOR'],
    exchangeDateFrom: new Date('2024-12-01'),
    exchangeDateTo: new Date('2024-12-31')
  },
  interpretation: {
    timeExpression: {
      original: '先月',
      resolved: {
        from: new Date('2024-12-01'),
        to: new Date('2024-12-31')
      }
    },
    attributes: [
      { type: 'industry', value: 'IT', confidence: 0.95 },
      { type: 'position', value: '部長クラス', confidence: 0.85 }
    ],
    explanation: '先月（2024年12月）に交換した、IT業界の部長級以上の方を検索'
  }
}
```

---

### 3.5 SK-005: 会社情報補完 Skill

#### 基本情報

```yaml
id: SK-005
name: 会社情報補完 Skill
version: 1.0.0
description: 会社名から業種・所在地等を自動補完する
category: データ補完
priority: recommended
externalApis:
  - 法人番号API（国税庁）
```

#### インターフェース

```typescript
interface CompanyLookupInput {
  /** 会社名 */
  companyName: string;
  /** 住所（部分一致用） */
  address?: string;
}

interface CompanyLookupOutput {
  /** 検索成功フラグ */
  found: boolean;
  /** 会社情報 */
  company?: {
    /** 正式名称 */
    officialName: string;
    /** 法人番号 */
    corporateNumber?: string;
    /** 所在地 */
    address?: string;
    /** 都道府県 */
    prefecture?: string;
    /** 業種（推定） */
    industry?: Industry;
    /** 設立日 */
    establishedDate?: string;
    /** 資本金 */
    capital?: number;
  };
  /** 候補リスト（複数ヒット時） */
  candidates?: CompanyCandidate[];
}
```

#### 法人番号API呼び出し

```typescript
const lookupCompany = async (
  companyName: string
): Promise<CompanyLookupOutput> => {
  // 国税庁法人番号API
  const response = await axios.get(
    'https://api.houjin-bangou.nta.go.jp/4/name',
    {
      params: {
        id: process.env.HOUJIN_API_ID,
        name: companyName,
        type: '02', // 部分一致
        mode: '01', // JIS第一・第二水準
        kind: '01'  // 国内本店のみ
      }
    }
  );
  
  // レスポンス解析
  const corporations = response.data.corporations || [];
  
  if (corporations.length === 0) {
    return { found: false };
  }
  
  if (corporations.length === 1) {
    return {
      found: true,
      company: mapToCampanyInfo(corporations[0])
    };
  }
  
  return {
    found: true,
    candidates: corporations.map(mapToCandidate)
  };
};
```

---

### 3.6 SK-006: タグ提案 Skill

#### 基本情報

```yaml
id: SK-006
name: タグ提案 Skill
version: 1.0.0
description: 名刺内容に基づいてタグを自動提案する
category: 自然言語処理
priority: optional
dependencies:
  - SK-002 (構造化 Skill)
```

#### インターフェース

```typescript
interface TagSuggestionInput {
  /** 名刺データ */
  card: BusinessCard;
  /** 出会い情報 */
  meetingContext?: {
    place?: string;
    date?: Date;
    memo?: string;
  };
  /** 既存タグリスト */
  existingTags: Tag[];
}

interface TagSuggestionOutput {
  /** 提案タグ */
  suggestions: TagSuggestion[];
}

interface TagSuggestion {
  /** タグ名（既存タグのIDまたは新規タグ名） */
  tagId?: string;
  newTagName?: string;
  /** 提案理由 */
  reason: string;
  /** 信頼度 */
  confidence: number;
}
```

#### 提案ロジック

```typescript
const suggestTags = async (
  input: TagSuggestionInput,
  settings: SkillSettings
): Promise<TagSuggestionOutput> => {
  const suggestions: TagSuggestion[] = [];
  
  // 1. ルールベース提案
  // 業種からの提案
  if (input.card.industry) {
    const industryTag = findOrSuggestTag(
      input.existingTags,
      INDUSTRY_MASTER[input.card.industry]
    );
    suggestions.push({
      ...industryTag,
      reason: `業種: ${INDUSTRY_MASTER[input.card.industry]}`,
      confidence: 0.9
    });
  }
  
  // 出会った場所からの提案
  if (input.meetingContext?.place) {
    const placeTag = findOrSuggestTag(
      input.existingTags,
      input.meetingContext.place
    );
    suggestions.push({
      ...placeTag,
      reason: `出会った場所: ${input.meetingContext.place}`,
      confidence: 0.85
    });
  }
  
  // 2. LLMによる高度な提案（オプション）
  if (settings.enableLlmTagSuggestion) {
    const llmSuggestions = await llmSuggestTags(input, settings.llmApiKey);
    suggestions.push(...llmSuggestions);
  }
  
  // 重複除去・信頼度順ソート
  return {
    suggestions: deduplicateAndSort(suggestions)
  };
};
```

---

### 3.7 SK-007: 優先度推定 Skill

#### 基本情報

```yaml
id: SK-007
name: 優先度推定 Skill
version: 1.0.0
description: 名刺の優先度を自動推定する
category: 推論
priority: optional
```

#### インターフェース

```typescript
interface PriorityEstimationInput {
  /** 名刺データ */
  card: BusinessCard;
  /** 交換した自分の所属 */
  myProfile: MyProfile;
  /** 交換状況 */
  exchangeContext?: {
    place?: string;
    wasIntroduced?: boolean;
    followUpPlanned?: boolean;
  };
}

interface PriorityEstimationOutput {
  /** 推定優先度（1-5） */
  priority: 1 | 2 | 3 | 4 | 5;
  /** 推定理由 */
  reasons: PriorityReason[];
  /** 信頼度 */
  confidence: number;
}

interface PriorityReason {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}
```

#### 推定ロジック

```typescript
const estimatePriority = (
  input: PriorityEstimationInput
): PriorityEstimationOutput => {
  let score = 3; // デフォルト: 普通
  const reasons: PriorityReason[] = [];
  
  // 役職レベルによる加点
  const positionScores: Record<PositionLevel, number> = {
    EXECUTIVE: 2,
    DIRECTOR: 1.5,
    MANAGER: 1,
    SECTION_CHIEF: 0.5,
    STAFF: 0,
    OTHER: 0
  };
  
  if (input.card.positionLevel) {
    const positionScore = positionScores[input.card.positionLevel];
    score += positionScore;
    reasons.push({
      factor: 'position',
      impact: positionScore > 0 ? 'positive' : 'neutral',
      description: `役職: ${input.card.position}`
    });
  }
  
  // 紹介経由による加点
  if (input.exchangeContext?.wasIntroduced) {
    score += 0.5;
    reasons.push({
      factor: 'introduction',
      impact: 'positive',
      description: '紹介経由での名刺交換'
    });
  }
  
  // フォローアップ予定による加点
  if (input.exchangeContext?.followUpPlanned) {
    score += 0.5;
    reasons.push({
      factor: 'followUp',
      impact: 'positive',
      description: 'フォローアップ予定あり'
    });
  }
  
  // スコアを1-5に正規化
  const priority = Math.max(1, Math.min(5, Math.round(score))) as 1|2|3|4|5;
  
  return {
    priority,
    reasons,
    confidence: 0.7
  };
};
```

---

### 3.8 SK-008: 画像前処理 Skill

#### 基本情報

```yaml
id: SK-008
name: 画像前処理 Skill
version: 1.0.0
description: 名刺画像を認識に最適な状態に前処理する
category: 画像処理
priority: required
externalApis: none (ローカル処理)
```

#### インターフェース

```typescript
interface ImagePreprocessInput {
  /** 元画像 */
  image: Blob | File;
  /** 処理オプション */
  options?: {
    /** 最大幅（px） */
    maxWidth?: number;
    /** 最大高さ（px） */
    maxHeight?: number;
    /** JPEG品質（0-1） */
    quality?: number;
    /** 傾き補正を行うか */
    deskew?: boolean;
    /** グレースケール変換を行うか */
    grayscale?: boolean;
  };
}

interface ImagePreprocessOutput {
  /** 処理後画像 */
  processedImage: Blob;
  /** Base64エンコード */
  base64: string;
  /** 元のサイズ */
  originalSize: { width: number; height: number };
  /** 処理後サイズ */
  processedSize: { width: number; height: number };
  /** ファイルサイズ（bytes） */
  fileSize: number;
  /** 適用された処理 */
  appliedProcesses: string[];
}
```

#### 処理実装

```typescript
import imageCompression from 'browser-image-compression';

const preprocessImage = async (
  input: ImagePreprocessInput
): Promise<ImagePreprocessOutput> => {
  const options = {
    maxWidth: input.options?.maxWidth ?? 2000,
    maxHeight: input.options?.maxHeight ?? 2000,
    quality: input.options?.quality ?? 0.85,
    ...input.options
  };
  
  const appliedProcesses: string[] = [];
  
  // 1. リサイズ・圧縮
  let processed = await imageCompression(input.image as File, {
    maxWidthOrHeight: Math.max(options.maxWidth, options.maxHeight),
    initialQuality: options.quality,
    useWebWorker: true
  });
  appliedProcesses.push('resize', 'compress');
  
  // 2. Canvas処理（傾き補正、グレースケール等）
  if (options.deskew || options.grayscale) {
    processed = await canvasProcess(processed, options);
    if (options.deskew) appliedProcesses.push('deskew');
    if (options.grayscale) appliedProcesses.push('grayscale');
  }
  
  // 3. Base64変換
  const base64 = await blobToBase64(processed);
  
  return {
    processedImage: processed,
    base64,
    originalSize: await getImageSize(input.image),
    processedSize: await getImageSize(processed),
    fileSize: processed.size,
    appliedProcesses
  };
};
```

---

## 4. Skill連携フロー

### 4.1 名刺登録フロー

```
┌─────────────────────────────────────────────────────────────────┐
│                        ユーザー操作                              │
│                    名刺画像をアップロード                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ SK-008: 画像前処理 Skill                                        │
│ - リサイズ、圧縮                                                 │
│ - 品質最適化                                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ SK-001: OCR Skill                                               │
│ - Cloud Vision API（優先）                                      │
│ - Tesseract.js（フォールバック）                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ SK-002: 構造化 Skill                                            │
│ - Claude APIでテキスト→構造化                                   │
│ - 正規表現フォールバック                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│ SK-005: 会社情報  │ │ SK-006: タグ提案  │ │ SK-007: 優先度    │
│ 補完 Skill        │ │ Skill             │ │ 推定 Skill        │
└───────────────────┘ └───────────────────┘ └───────────────────┘
              │               │               │
              └───────────────┼───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ SK-003: 重複判定 Skill                                          │
│ - 既存名刺との照合                                               │
│ - 重複候補があれば通知                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        確認・編集画面                            │
│                 ユーザーが結果を確認・修正                        │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Skill Orchestrator実装

```typescript
interface SkillOrchestrator {
  processNewCard(image: Blob, context: ProcessContext): Promise<ProcessResult>;
  searchCards(query: string, context: SearchContext): Promise<SearchResult>;
  checkDuplicates(card: BusinessCard): Promise<DuplicateCheckResult>;
}

class CardProcessingOrchestrator implements SkillOrchestrator {
  constructor(
    private imagePreprocessSkill: ImagePreprocessSkill,
    private ocrSkill: OCRSkill,
    private structureSkill: StructureSkill,
    private companyLookupSkill: CompanyLookupSkill,
    private tagSuggestionSkill: TagSuggestionSkill,
    private priorityEstimationSkill: PriorityEstimationSkill,
    private duplicateCheckSkill: DuplicateCheckSkill,
    private settings: SkillSettings
  ) {}

  async processNewCard(
    image: Blob, 
    context: ProcessContext
  ): Promise<ProcessResult> {
    // 1. 画像前処理
    const preprocessed = await this.imagePreprocessSkill.process({
      image,
      options: { maxWidth: 2000, quality: 0.85 }
    });

    // 2. OCR
    const ocrResult = await this.ocrSkill.process({
      image: preprocessed.base64,
      mimeType: 'image/jpeg',
      languages: this.settings.ocrLanguages,
      mode: 'auto'
    });

    // 3. 構造化
    const structuredResult = await this.structureSkill.process({
      ocrText: ocrResult.fullText,
      textBlocks: ocrResult.blocks
    });

    // 4. 並列処理: 補完、タグ提案、優先度推定
    const [companyInfo, tagSuggestions, priorityEstimation] = await Promise.all([
      this.settings.enableCompanyLookup && structuredResult.data.companyName
        ? this.companyLookupSkill.process({ 
            companyName: structuredResult.data.companyName 
          })
        : null,
      this.settings.enableTagSuggestion
        ? this.tagSuggestionSkill.process({
            card: structuredResult.data,
            meetingContext: context.meetingContext,
            existingTags: context.existingTags
          })
        : null,
      this.settings.enablePriorityEstimation
        ? this.priorityEstimationSkill.process({
            card: structuredResult.data,
            myProfile: context.selectedProfile,
            exchangeContext: context.exchangeContext
          })
        : null
    ]);

    // 5. 重複チェック
    const duplicates = await this.checkDuplicatesAgainstAll(
      structuredResult.data,
      context.existingCards
    );

    return {
      cardData: this.mergeResults(
        structuredResult.data,
        companyInfo,
        priorityEstimation
      ),
      preprocessedImage: preprocessed,
      ocrConfidence: ocrResult.confidence,
      fieldConfidence: structuredResult.fieldConfidence,
      tagSuggestions: tagSuggestions?.suggestions || [],
      duplicateCandidates: duplicates,
      processingTime: {
        total: Date.now() - startTime,
        ocr: ocrResult.processingTime,
        structure: structuredResult.processingTime
      }
    };
  }
}
```

---

## 5. エラーハンドリング

### 5.1 エラー分類

| カテゴリ | エラーコード | 対応方針 |
|----------|--------------|----------|
| 認証エラー | AUTH_* | 設定画面へ誘導、APIキー確認促す |
| API制限 | QUOTA_* | フォールバック処理、ユーザー通知 |
| ネットワーク | NETWORK_* | リトライ、フォールバック |
| 処理エラー | PROCESS_* | ログ記録、手動入力促す |
| 入力エラー | INPUT_* | バリデーションメッセージ表示 |

### 5.2 エラーコード一覧

```typescript
enum SkillErrorCode {
  // 認証系
  AUTH_INVALID_API_KEY = 'AUTH_INVALID_API_KEY',
  AUTH_EXPIRED_API_KEY = 'AUTH_EXPIRED_API_KEY',
  
  // API制限系
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // ネットワーク系
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_UNAVAILABLE = 'NETWORK_UNAVAILABLE',
  
  // OCR系
  OCR_NO_TEXT_DETECTED = 'OCR_NO_TEXT_DETECTED',
  OCR_LOW_CONFIDENCE = 'OCR_LOW_CONFIDENCE',
  OCR_INVALID_IMAGE = 'OCR_INVALID_IMAGE',
  
  // 構造化系
  STRUCTURE_PARSE_FAILED = 'STRUCTURE_PARSE_FAILED',
  STRUCTURE_INSUFFICIENT_DATA = 'STRUCTURE_INSUFFICIENT_DATA',
  
  // 一般系
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

### 5.3 フォールバック戦略

```typescript
const FALLBACK_STRATEGY: Record<string, FallbackAction> = {
  // OCR
  'SK-001': {
    primary: 'cloud',
    fallbacks: ['local'],
    onAllFailed: 'manual_input'
  },
  
  // 構造化
  'SK-002': {
    primary: 'llm',
    fallbacks: ['regex'],
    onAllFailed: 'partial_result'
  },
  
  // 会社情報
  'SK-005': {
    primary: 'api',
    fallbacks: [],
    onAllFailed: 'skip'
  }
};
```

---

## 6. 設定・APIキー管理

### 6.1 設定項目

```typescript
interface SkillSettings {
  // OCR設定
  cloudOcrProvider: 'google' | 'azure' | 'aws';
  cloudOcrApiKey: string | null;
  ocrLanguages: ('ja' | 'en' | 'zh' | 'ko')[];
  ocrFallbackEnabled: boolean;
  
  // LLM設定
  llmProvider: 'anthropic' | 'openai' | 'google';
  llmApiKey: string | null;
  llmModel: string;
  
  // 機能有効/無効
  enableCompanyLookup: boolean;
  enableTagSuggestion: boolean;
  enablePriorityEstimation: boolean;
  enableLlmDuplicateCheck: boolean;
  
  // パフォーマンス
  maxConcurrentRequests: number;
  timeoutMs: number;
}
```

### 6.2 APIキーの安全な保存

```typescript
// APIキーの暗号化保存
const encryptApiKey = async (
  apiKey: string, 
  userPassword: string
): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(userPassword, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(apiKey)
  );
  
  return JSON.stringify({
    salt: Array.from(salt),
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  });
};

// APIキーの復号
const decryptApiKey = async (
  encryptedData: string, 
  userPassword: string
): Promise<string> => {
  const { salt, iv, data } = JSON.parse(encryptedData);
  const key = await deriveKey(userPassword, new Uint8Array(salt));
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    new Uint8Array(data)
  );
  
  return new TextDecoder().decode(decrypted);
};
```

### 6.3 設定画面UIイメージ

```
┌─────────────────────────────────────────────────────────────────┐
│ AI設定                                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ OCR設定                                                         │
│ ─────────────────────────────────────────────────────────────  │
│ プロバイダー    [Google Cloud Vision ▼]                         │
│ APIキー         [••••••••••••••••••••] [表示] [テスト]          │
│ 認識言語        ☑ 日本語  ☑ 英語  ☐ 中国語  ☐ 韓国語          │
│ ローカルフォールバック  [有効 ▼]                                │
│                                                                 │
│ AI構造化設定                                                    │
│ ─────────────────────────────────────────────────────────────  │
│ プロバイダー    [Anthropic Claude ▼]                            │
│ APIキー         [••••••••••••••••••••] [表示] [テスト]          │
│ モデル          [claude-sonnet-4-20250514 ▼]                        │
│                                                                 │
│ AI機能                                                          │
│ ─────────────────────────────────────────────────────────────  │
│ ☑ 会社情報の自動補完                                            │
│ ☑ タグの自動提案                                                │
│ ☑ 優先度の自動推定                                              │
│ ☑ AI重複判定（高精度）                                          │
│                                                                 │
│                                          [キャンセル] [保存]    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 改訂履歴

| Ver | 日付 | 内容 |
|-----|------|------|
| 1.0 | 2025/01/17 | 初版作成 |
| 2.0 | 2026/01/18 | OCR Skillの実装をGemini 3 Flash PreviewにImage-to-JSONで統合、responseMimeType: application/jsonを使用する形式に変更。Tesseract.jsへのフォールバックは未実装。 |
| 3.0 | 2026/01/21 | BusinessCardDataにfaxフィールドを追加し、プロンプトおよびフォールバック抽出処理を更新。 |
