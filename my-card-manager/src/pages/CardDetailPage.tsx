import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCardStore } from '../stores/cardStore';
import { ArrowLeft, Edit2, Trash2, Mail, Phone, Building2, MapPin, Globe, Plus, Tag as TagIcon, MessageSquare, Calendar, Star } from 'lucide-react';
import { BusinessCard, Tag, InteractionNote } from '../types/models';
import { tagService } from '../services/db/tagService';
import { interactionService } from '../services/db/interactionService';
import { useAuthStore } from '../stores/authStore';
import { StarRating } from '../components/common/StarRating';
import { useProfileStore } from '../stores/profileStore';

export const CardDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { selectedCard: card, selectedCardImages: images, loadCardDetail, updateCard, deleteCard, uploadImage, deleteImage, isLoading, error } = useCardStore();
    const { getProfileName } = useProfileStore();

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<BusinessCard>>({});

    // Tag State
    const [tags, setTags] = useState<Tag[]>([]);
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [newTagName, setNewTagName] = useState('');

    // Interaction State
    const [notes, setNotes] = useState<InteractionNote[]>([]);
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [newNoteDate, setNewNoteDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (id) {
            loadCardDetail(id);
            loadTags(id);
            loadNotes(id);
        }
    }, [id, loadCardDetail]);

    useEffect(() => {
        if (user) {
            loadAllTags(user.id);
        }
    }, [user, isAddingTag]); // Reload all tags when adding mode changes (in case created elsewhere)

    const loadTags = async (cardId: string) => {
        const t = await tagService.getTagsForCard(cardId);
        setTags(t);
    };

    const loadAllTags = async (userId: string) => {
        const t = await tagService.getAll(userId);
        setAllTags(t);
    };

    const loadNotes = async (cardId: string) => {
        const n = await interactionService.getNotes(cardId);
        // Sort descending locally for view if needed, but service returns date asc. 
        // Let's reverse for Timeline view (newest first)
        setNotes(n.reverse());
    };

    const handleAddTag = async () => {
        if (!user || !card || !newTagName.trim()) return;

        try {
            // Check if tag exists by name
            const existingTag = allTags.find(t => t.name === newTagName.trim());
            let tagId = existingTag?.id;

            if (!tagId) {
                // Create new tag
                const newTag = await tagService.create(user.id, newTagName.trim(), 'blue'); // Default color
                tagId = newTag.id;
                setAllTags([...allTags, newTag]);
            }

            // Assign
            await tagService.assignToCard(card.id, tagId);
            await loadTags(card.id);
            setNewTagName('');
            setIsAddingTag(false);
        } catch (e) {
            console.error('Failed to add tag', e);
            alert('タグの追加に失敗しました');
        }
    };

    const handleRemoveTag = async (tagId: string) => {
        if (!card) return;
        if (!confirm('タグを解除しますか？')) return;
        await tagService.removeFromCard(card.id, tagId);
        await loadTags(card.id);
    };

    const handleAddNote = async () => {
        if (!card || !newNoteContent.trim() || !newNoteDate) return;

        try {
            await interactionService.addNote(card.id, newNoteContent, new Date(newNoteDate));
            await loadNotes(card.id);
            setNewNoteContent('');
            setIsAddingNote(false);
        } catch (e) {
            console.error('Failed to add note', e);
            alert(e instanceof Error ? e.message : 'メモの追加に失敗しました');
        }
    };


    useEffect(() => {
        if (card) {
            setFormData(card);
        }
    }, [card]);

    if (isLoading) return <div className="p-8 text-center">Loading...</div>;
    if (error || !card) return <div className="p-8 text-center text-red-500">Card not found</div>;

    const handleDelete = async () => {
        if (confirm('本当に削除しますか？')) {
            await deleteCard(card.id);
            navigate('/');
        }
    };

    const handleSave = async () => {
        await updateCard(card.id, formData);
        setIsEditing(false);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !card) return;
        await uploadImage(card.id, file);
    };

    const handleImageDelete = async (imageId: string) => {
        if (!confirm('画像を削除しますか？')) return;
        await deleteImage(imageId);
    };

    // Helper for editable field
    const EditableField = ({
        label,
        value,
        field,
        icon: Icon
    }: {
        label: string;
        value?: string;
        field: keyof BusinessCard;
        icon?: any
    }) => {
        return (
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                    {Icon && <Icon className="w-4 h-4 mr-1" />}
                    {label}
                </label>
                {isEditing ? (
                    <input
                        type="text"
                        value={String(formData[field] || '')}
                        onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 border"
                    />
                ) : (
                    <div className="text-gray-900 dark:text-white text-base min-h-[1.5em]">
                        {value || '-'}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center">
                        <button onClick={() => navigate('/')} className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            名刺詳細
                        </h1>
                        <span className="ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border dark:border-gray-600">
                            自分の所属: {getProfileName(card.profileId)}
                        </span>
                    </div>
                    <div className="flex space-x-2">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                                >
                                    保存
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm dark:bg-gray-800 dark:border-gray-700"
                                >
                                    <Edit2 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="p-2 text-red-500 hover:text-red-700 bg-white border border-gray-300 rounded-md shadow-sm dark:bg-gray-800 dark:border-gray-700"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Image (1 col) */}
                    <div className="space-y-4">
                        {images.map((img, index) => (
                            <div key={img.id} className="relative group bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border dark:border-gray-700">
                                <img
                                    src={URL.createObjectURL(img.imageData)}
                                    alt={`Business Card ${img.imageType} ${index}`}
                                    className="w-full h-auto rounded"
                                />
                                {isEditing && (
                                    <button
                                        onClick={() => handleImageDelete(img.id)}
                                        className="absolute top-4 right-4 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                        title="画像を削除"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                                <div className="absolute bottom-4 left-4 px-2 py-0.5 bg-black/50 text-white text-[10px] rounded uppercase">
                                    {img.imageType === 'front' ? '表面' : img.imageType === 'back' ? '裏面' : 'その他'}
                                </div>
                            </div>
                        ))}

                        {images.length === 0 && !isEditing && (
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border dark:border-gray-700 border-dashed flex flex-col items-center justify-center text-gray-400">
                                <Plus className="w-8 h-8 mb-2 opacity-20" />
                                <span className="text-sm">画像なし</span>
                            </div>
                        )}

                        {isEditing && (
                            <div className="relative">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Plus className="w-8 h-8 mb-2 text-gray-400" />
                                        <p className="text-xs text-gray-500 dark:text-gray-400">画像を追加</p>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Middle Column: Info (2 cols) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Info */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-2">基本情報</h2>
                            <EditableField label="会社名" field="companyName" value={formData.companyName} icon={Building2} />
                            <EditableField label="氏名" field="personName" value={formData.personName} />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <EditableField label="部署" field="department" value={formData.department} />
                                <EditableField label="役職" field="position" value={formData.position} />
                            </div>

                            <EditableField label="Email" field="email" value={formData.email} icon={Mail} />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <EditableField label="携帯電話" field="mobile" value={formData.mobile} icon={Phone} />
                                <EditableField label="固定電話" field="phone" value={formData.phone} icon={Phone} />
                            </div>

                            <EditableField label="FAX" field="fax" value={formData.fax} icon={Phone} />

                            <EditableField label="住所" field="address" value={formData.address} icon={MapPin} />
                            <EditableField label="Webサイト" field="website" value={formData.website} icon={Globe} />

                            {/* Priority Rating */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center">
                                    <Star className="w-4 h-4 mr-1" />
                                    優先度
                                </label>
                                <StarRating
                                    value={formData.priority ?? card.priority}
                                    onChange={(val) => {
                                        setFormData({ ...formData, priority: val });
                                        if (!isEditing) {
                                            // Auto-save priority when not in edit mode
                                            updateCard(card.id, { priority: val });
                                        }
                                    }}
                                />
                            </div>

                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 mt-4">
                                <div className="text-xs text-gray-400">
                                    登録日: {new Date(card.createdAt).toLocaleString()} <br />
                                    更新日: {new Date(card.updatedAt).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* Tags Section */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                    <TagIcon className="w-5 h-5 mr-2" /> タグ
                                </h2>
                                {!isAddingTag && (
                                    <button onClick={() => setIsAddingTag(true)} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center">
                                        <Plus className="w-4 h-4 mr-1" /> 追加
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2 mb-4">
                                {tags.length === 0 && <p className="text-gray-400 text-sm">タグはまだありません</p>}
                                {tags.map(tag => (
                                    <span key={tag.id} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        {tag.name}
                                        <button onClick={() => handleRemoveTag(tag.id)} className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200">
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>

                            {isAddingTag && (
                                <div className="flex items-center space-x-2 mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                                    <input
                                        type="text"
                                        placeholder="新しいタグ名を入力"
                                        value={newTagName}
                                        onChange={(e) => setNewTagName(e.target.value)}
                                        className="flex-1 rounded-md border-gray-300 shadow-sm sm:text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white p-2 border"
                                        list="existing-tags"
                                    />
                                    <datalist id="existing-tags">
                                        {allTags.map(t => <option key={t.id} value={t.name} />)}
                                    </datalist>
                                    <button onClick={handleAddTag} className="px-3 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700">登録</button>
                                    <button onClick={() => setIsAddingTag(false)} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200">キャンセル</button>
                                </div>
                            )}
                        </div>

                        {/* Interaction Logs (Timeline) */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                    <MessageSquare className="w-5 h-5 mr-2" /> 対話ログ (メモ)
                                </h2>
                                <button
                                    onClick={() => setIsAddingNote(!isAddingNote)}
                                    className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-200 font-medium flex items-center"
                                >
                                    <Plus className="w-4 h-4 mr-1" /> {isAddingNote ? '閉じる' : 'メモを追加'}
                                </button>
                            </div>

                            {/* Add Note Form */}
                            {isAddingNote && (
                                <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 rounded-lg">
                                    <div className="mb-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">日付</label>
                                        <input
                                            type="date"
                                            value={newNoteDate}
                                            onChange={(e) => setNewNoteDate(e.target.value)}
                                            className="rounded-md border-gray-300 shadow-sm sm:text-sm bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-1 border"
                                        />
                                    </div>
                                    <div className="mb-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">内容</label>
                                        <textarea
                                            value={newNoteContent}
                                            onChange={(e) => setNewNoteContent(e.target.value)}
                                            placeholder="会話の内容などを記録..."
                                            className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border h-24"
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <button onClick={handleAddNote} className="px-4 py-2 bg-yellow-500 text-white rounded-md text-sm hover:bg-yellow-600 font-medium">
                                            記録する
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Timeline */}
                            <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-8 pb-4">
                                {notes.length === 0 && (
                                    <div className="ml-6 py-4 text-gray-400 text-sm">
                                        記録はまだありません
                                    </div>
                                )}
                                {notes.map((note) => (
                                    <div key={note.id} className="relative ml-6">
                                        <span className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-white border-2 border-blue-500 dark:bg-gray-800"></span>
                                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-1">
                                            <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center">
                                                <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                                                {new Date(note.date).toLocaleDateString()}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
                                            {note.content}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
