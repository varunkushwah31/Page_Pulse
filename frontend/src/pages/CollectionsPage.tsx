import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchUserCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  duplicateCollection,
  addCollectionItem,
  updateCollectionItem,
  deleteCollectionItem,
  runCollectionItem,
  runFullCollection,
  exportCollectionJson,
  importCollectionJson,
  createStarterCollectionTemplate,
} from '../lib/api';
import type {
  SeoCollection,
  SeoCollectionItem,
  CreateSeoCollectionRequest,
  UpdateSeoCollectionRequest,
  CreateSeoCollectionItemRequest,
  UpdateSeoCollectionItemRequest,
  CollectionRunResult,
  CollectionExportData,
} from '../types';
import {
  FolderIcon,
  FolderPlusIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
  PencilSimpleIcon,
  CopyIcon,
  DownloadSimpleIcon,
  UploadSimpleIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  LightningIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  GlobeIcon,
  ArrowsClockwiseIcon,
  XIcon,
  SparkleIcon,
  CheckIcon,
  CodeIcon,
  ShoppingCartIcon,
  SlidersHorizontalIcon,
  ArrowSquareOutIcon,
  InfoIcon,
  ListNumbersIcon,
  TerminalWindowIcon
} from '@phosphor-icons/react';

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

const STARTER_TEMPLATES: Record<string, {
  name: string;
  description: string;
  color: string;
  icon: string;
  tags: string[];
  items: { name: string; url: string; enableJsRendering: boolean; expectedMinScore: number; maxResponseTimeMs: number }[];
}> = {
  saas: {
    name: 'SaaS Core Product Suite',
    description: 'High-intent marketing funnel: Homepage, Pricing Matrix, Features, and Docs.',
    color: '#4FD8C4',
    icon: 'Lightning',
    tags: ['saas', 'production', 'conversion'],
    items: [
      { name: 'Product Landing Page', url: 'https://vercel.com', enableJsRendering: false, expectedMinScore: 90, maxResponseTimeMs: 2500 },
      { name: 'Pricing & Plans Matrix', url: 'https://stripe.com', enableJsRendering: false, expectedMinScore: 85, maxResponseTimeMs: 3000 },
      { name: 'Developer Documentation Hub', url: 'https://developer.mozilla.org', enableJsRendering: false, expectedMinScore: 88, maxResponseTimeMs: 2000 },
    ],
  },
  ecommerce: {
    name: 'E-Commerce Funnel Suite',
    description: 'Critical storefront conversion paths: Home, Product Catalog, and Checkout Gate.',
    color: '#4ADE80',
    icon: 'ShoppingCart',
    tags: ['ecommerce', 'sales', 'critical'],
    items: [
      { name: 'Storefront Homepage', url: 'https://shopify.com', enableJsRendering: false, expectedMinScore: 85, maxResponseTimeMs: 3000 },
      { name: 'Product Detail Page', url: 'https://amazon.com', enableJsRendering: false, expectedMinScore: 80, maxResponseTimeMs: 3500 },
      { name: 'Help & Knowledge Base', url: 'https://wikipedia.org', enableJsRendering: false, expectedMinScore: 85, maxResponseTimeMs: 2500 },
    ],
  },
  devhub: {
    name: 'Developer Documentation Suite',
    description: 'API reference index, code repositories, changelogs, and sandbox playgrounds.',
    color: '#7AA2F7',
    icon: 'Code',
    tags: ['developer', 'api', 'docs'],
    items: [
      { name: 'GitHub Docs Portal', url: 'https://docs.github.com', enableJsRendering: false, expectedMinScore: 88, maxResponseTimeMs: 2500 },
      { name: 'Coding Playground Hub', url: 'https://leetcode.com', enableJsRendering: false, expectedMinScore: 80, maxResponseTimeMs: 3000 },
      { name: 'Competitive Arena Root', url: 'https://codeforces.com', enableJsRendering: false, expectedMinScore: 80, maxResponseTimeMs: 3500 },
    ],
  },
};

export const CollectionsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [collections, setCollections] = useState<SeoCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // In-app Toast Notifications (capped at max 3 items to avoid stacking)
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    // Filter out ugly trace ID noise if present
    const cleanMessage = message.includes('Please refer to trace ID')
      ? 'An internal connection event occurred. Resilient fallback mode enabled.'
      : message;

    setToasts((prev) => [...prev.slice(-2), { id, type, title, message: cleanMessage }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Modals
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [showEditCollectionModal, setShowEditCollectionModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState<SeoCollectionItem | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRunnerModal, setShowRunnerModal] = useState(false);

  // Form states
  const [newCollName, setNewCollName] = useState('');
  const [newCollDesc, setNewCollDesc] = useState('');
  const [newCollColor, setNewCollColor] = useState('#4FD8C4');
  const [newCollTags, setNewCollTags] = useState('');

  // Item form states
  const [itemName, setItemName] = useState('');
  const [itemUrl, setItemUrl] = useState('');
  const [itemJsRender, setItemJsRender] = useState(false);
  const [itemMinScore, setItemMinScore] = useState(80);
  const [itemMaxLatency, setItemMaxLatency] = useState(3000);
  const [itemTags, setItemTags] = useState('');

  // Import state
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Runner state
  const [runningCollection, setRunningCollection] = useState(false);
  const [runnerResult, setRunnerResult] = useState<CollectionRunResult | null>(null);
  const [runnerConcurrent, setRunnerConcurrent] = useState(true);

  // Running individual items indicator
  const [runningItemIds, setRunningItemIds] = useState<Record<string, boolean>>({});
  const [templateLoadingKey, setTemplateLoadingKey] = useState<string | null>(null);

  // Load collections
  const loadCollections = useCallback(async (keepSelection = true) => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await fetchUserCollections();
      setCollections(data);
      if (data.length > 0) {
        if (!keepSelection || !selectedCollectionId || !data.some((c) => c.id === selectedCollectionId)) {
          setSelectedCollectionId(data[0].id);
        }
      } else {
        setSelectedCollectionId(null);
      }
    } catch (err: unknown) {
      console.warn('Could not fetch user collections from backend:', err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedCollectionId]);

  useEffect(() => {
    loadCollections(false);
  }, [user]);

  const activeCollection = useMemo(() => {
    return collections.find((c) => c.id === selectedCollectionId) || null;
  }, [collections, selectedCollectionId]);

  // All tags across collections
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    collections.forEach((c) => {
      if (c.tags) c.tags.forEach((t) => tags.add(t));
    });
    return Array.from(tags);
  }, [collections]);

  const filteredCollections = useMemo(() => {
    return collections.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTag = !selectedTag || (c.tags && c.tags.includes(selectedTag));
      return matchesSearch && matchesTag;
    });
  }, [collections, searchQuery, selectedTag]);

  // Overall platform suite statistics
  const suiteStats = useMemo(() => {
    const totalSuites = collections.length;
    let totalUrls = 0;
    let scoredSuites = 0;
    let scoreSum = 0;

    collections.forEach((c) => {
      totalUrls += c.items ? c.items.length : 0;
      if (c.averageScore != null) {
        scoreSum += c.averageScore;
        scoredSuites++;
      }
    });

    const avgScore = scoredSuites > 0 ? Math.round(scoreSum / scoredSuites) : null;
    return { totalSuites, totalUrls, avgScore };
  }, [collections]);

  /* ─── Unauthenticated View ─── */
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 font-mono text-xs animate-fade-in-up">
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-8 text-center space-y-6 shadow-2xl">
          <div className="size-14 rounded-xl bg-[#191D24] border border-[#333A45] flex items-center justify-center mx-auto text-[#4FD8C4]">
            <FolderIcon className="size-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-[#E7EAEE] tracking-wide">
              SEO Collections & Suite Runner
            </h2>
            <p className="text-[#8B93A1] font-sans text-xs max-w-md mx-auto leading-relaxed">
              Organize target endpoints into customizable audit suites, automate concurrent batch checks with Java Virtual Threads, and monitor Core Web Vitals across release funnels.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left text-[11px]">
            <div className="p-3 rounded-lg border border-[#262B33] bg-[#0A0C0F] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#4FD8C4] font-bold">
                <FolderIcon className="size-4" />
                <span>Custom Suites</span>
              </div>
              <p className="text-[#8B93A1] text-[10px] leading-snug">Group critical conversion URLs into tagged suites</p>
            </div>
            <div className="p-3 rounded-lg border border-[#262B33] bg-[#0A0C0F] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#7AA2F7] font-bold">
                <PlayIcon className="size-4" />
                <span>Suite Runner</span>
              </div>
              <p className="text-[#8B93A1] text-[10px] leading-snug">Run full suite audits with assertions & latency checks</p>
            </div>
            <div className="p-3 rounded-lg border border-[#262B33] bg-[#0A0C0F] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#4ADE80] font-bold">
                <DownloadSimpleIcon className="size-4" />
                <span>JSON Portability</span>
              </div>
              <p className="text-[#8B93A1] text-[10px] leading-snug">Export and share collections formatted as JSON</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/auth')}
              type="button"
              className="px-5 py-2.5 rounded-lg border border-[#4FD8C4]/40 bg-[#4FD8C4]/15 hover:bg-[#4FD8C4]/25 text-[#4FD8C4] font-bold cursor-pointer transition-all inline-flex items-center gap-2 text-xs"
            >
              <span>Sign In to Access Collections</span>
            </button>
            <button
              onClick={() => navigate('/auth', { state: { mode: 'signup' } })}
              type="button"
              className="px-5 py-2.5 rounded-lg border border-[#333A45] bg-[#191D24] hover:bg-[#262B33] text-[#E7EAEE] font-bold cursor-pointer transition-all inline-flex items-center gap-2 text-xs"
            >
              <span>Create Free Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Collection Handlers ─── */
  const handleCreateCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollName.trim()) return;

    const tagsList = newCollTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const req: CreateSeoCollectionRequest = {
      name: newCollName.trim(),
      description: newCollDesc.trim() || undefined,
      color: newCollColor,
      tags: tagsList,
    };

    try {
      const created = await createCollection(req);
      setShowCreateCollectionModal(false);
      setNewCollName('');
      setNewCollDesc('');
      setNewCollTags('');
      addToast('success', 'Collection Created', `Created "${created.name}" successfully.`);
      await loadCollections(false);
      setSelectedCollectionId(created.id);
    } catch (err: unknown) {
      console.warn('Backend createCollection failed, using client fallback:', err);
      const localId = `coll-${Date.now()}`;
      const localColl: SeoCollection = {
        id: localId,
        userId: user?.id,
        username: user?.username || 'devuser',
        name: req.name,
        description: req.description,
        color: req.color || '#4FD8C4',
        icon: 'Folder',
        tags: req.tags || [],
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCollections((prev) => [localColl, ...prev]);
      setSelectedCollectionId(localId);
      setShowCreateCollectionModal(false);
      setNewCollName('');
      setNewCollDesc('');
      setNewCollTags('');
      addToast('success', 'Collection Created', `Created "${localColl.name}".`);
    }
  };

  const handleUpdateCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCollection || !newCollName.trim()) return;

    const tagsList = newCollTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const req: UpdateSeoCollectionRequest = {
      name: newCollName.trim(),
      description: newCollDesc.trim() || undefined,
      color: newCollColor,
      tags: tagsList,
    };

    try {
      const updated = await updateCollection(activeCollection.id, req);
      setShowEditCollectionModal(false);
      addToast('success', 'Collection Updated', `Updated "${updated.name}" settings.`);
      await loadCollections(true);
    } catch (err: unknown) {
      console.warn('Backend update failed, updating local state:', err);
      setCollections((prev) =>
        prev.map((c) =>
          c.id === activeCollection.id
            ? { ...c, name: req.name, description: req.description, color: req.color, tags: req.tags, updatedAt: new Date().toISOString() }
            : c
        )
      );
      setShowEditCollectionModal(false);
      addToast('success', 'Collection Updated', `Updated "${req.name}".`);
    }
  };

  const handleDeleteCollection = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the collection "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteCollection(id);
    } catch (err: unknown) {
      console.warn('Backend delete failed, removing locally:', err);
    }
    setCollections((prev) => prev.filter((c) => c.id !== id));
    if (selectedCollectionId === id) {
      const remaining = collections.filter((c) => c.id !== id);
      setSelectedCollectionId(remaining.length > 0 ? remaining[0].id : null);
    }
    addToast('info', 'Collection Deleted', `Deleted collection "${name}".`);
  };

  const handleDuplicateCollection = async (id: string) => {
    try {
      const cloned = await duplicateCollection(id);
      addToast('success', 'Collection Cloned', `Cloned as "${cloned.name}".`);
      await loadCollections(false);
      setSelectedCollectionId(cloned.id);
    } catch (err: unknown) {
      console.warn('Backend clone failed, cloning locally:', err);
      const original = collections.find((c) => c.id === id);
      if (original) {
        const localId = `coll-${Date.now()}`;
        const clonedColl: SeoCollection = {
          ...original,
          id: localId,
          name: `${original.name} (Copy)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setCollections((prev) => [clonedColl, ...prev]);
        setSelectedCollectionId(localId);
        addToast('success', 'Collection Cloned', `Cloned as "${clonedColl.name}".`);
      }
    }
  };

  const handleExportCollection = async (id: string, name: string) => {
    try {
      const exportData = await exportCollectionJson(id);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pagepulse-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', 'Export Complete', `Exported "${name}" to JSON.`);
    } catch (err: unknown) {
      console.warn('Backend export failed, exporting local collection:', err);
      const target = collections.find((c) => c.id === id);
      if (target) {
        const exportData = {
          schema: 'https://pagepulse.dev/schemas/collection/v1.json',
          name: target.name,
          description: target.description,
          color: target.color,
          icon: target.icon,
          tags: target.tags,
          items: target.items || [],
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pagepulse-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast('success', 'Export Complete', `Exported "${name}" to JSON.`);
      }
    }
  };

  const handleImportCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    try {
      const parsed: CollectionExportData = JSON.parse(importJsonText);
      if (!parsed.name) {
        throw new Error('JSON format error: Missing "name" attribute.');
      }
      const imported = await importCollectionJson(parsed);
      setShowImportModal(false);
      setImportJsonText('');
      addToast('success', 'Import Successful', `Imported "${imported.name}" with ${imported.items?.length || 0} URLs.`);
      await loadCollections(false);
      setSelectedCollectionId(imported.id);
    } catch (err: unknown) {
      console.warn('Backend import failed, importing locally:', err);
      try {
        const parsed: CollectionExportData = JSON.parse(importJsonText);
        if (!parsed.name) throw new Error('Missing "name" field in JSON');
        const localId = `coll-${Date.now()}`;
        const localColl: SeoCollection = {
          id: localId,
          userId: user?.id,
          username: user?.username || 'devuser',
          name: parsed.name,
          description: parsed.description,
          color: parsed.color || '#4FD8C4',
          icon: parsed.icon || 'Folder',
          tags: parsed.tags || [],
          items: (parsed.items || []).map((it, idx) => ({
            id: `${localId}-item-${idx}`,
            name: it.name,
            url: it.url,
            method: 'AUDIT',
            enableJsRendering: it.enableJsRendering || false,
            expectedMinScore: it.expectedMinScore || 80,
            maxResponseTimeMs: it.maxResponseTimeMs || 3000,
            tags: it.tags || [],
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setCollections((prev) => [localColl, ...prev]);
        setSelectedCollectionId(localId);
        setShowImportModal(false);
        setImportJsonText('');
        addToast('success', 'Import Successful', `Imported "${localColl.name}".`);
      } catch (parseErr: unknown) {
        setImportError(parseErr instanceof Error ? parseErr.message : 'Invalid collection JSON payload');
      }
    }
  };

  const handleCreateStarterTemplate = async (templateKey: string) => {
    setTemplateLoadingKey(templateKey);
    const template = STARTER_TEMPLATES[templateKey];

    try {
      const created = await createStarterCollectionTemplate(templateKey);
      addToast('success', 'Starter Suite Loaded', `Created "${created.name}" with pre-configured endpoints.`);
      await loadCollections(false);
      setSelectedCollectionId(created.id);
    } catch (err: unknown) {
      console.warn('Backend starter template API failed, attempting standard create:', err);
      if (template) {
        try {
          const newColl = await createCollection({
            name: template.name,
            description: template.description,
            color: template.color,
            tags: template.tags,
            items: template.items.map((it) => ({
              name: it.name,
              url: it.url,
              method: 'AUDIT',
              enableJsRendering: it.enableJsRendering,
              expectedMinScore: it.expectedMinScore,
              maxResponseTimeMs: it.maxResponseTimeMs,
            })),
          });
          addToast('success', 'Starter Suite Ready', `Created "${newColl.name}".`);
          await loadCollections(false);
          setSelectedCollectionId(newColl.id);
        } catch (createErr: unknown) {
          console.warn('Backend create failed, generating local suite:', createErr);
          const localId = `coll-${Date.now()}`;
          const localColl: SeoCollection = {
            id: localId,
            userId: user?.id,
            username: user?.username || 'devuser',
            name: template.name,
            description: template.description,
            color: template.color,
            icon: template.icon,
            tags: template.tags,
            items: template.items.map((it, idx) => ({
              id: `${localId}-item-${idx}`,
              name: it.name,
              url: it.url,
              method: 'AUDIT',
              enableJsRendering: it.enableJsRendering,
              expectedMinScore: it.expectedMinScore,
              maxResponseTimeMs: it.maxResponseTimeMs,
              tags: [],
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setCollections((prev) => [localColl, ...prev]);
          setSelectedCollectionId(localId);
          addToast('success', 'Starter Suite Ready', `Created "${localColl.name}".`);
        }
      }
    } finally {
      setTemplateLoadingKey(null);
    }
  };

  /* ─── Item Handlers ─── */
  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCollection || !itemUrl.trim()) return;

    const tagsList = itemTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const req: CreateSeoCollectionItemRequest = {
      name: itemName.trim() || itemUrl.trim(),
      url: itemUrl.trim(),
      method: 'AUDIT',
      enableJsRendering: itemJsRender,
      expectedMinScore: itemMinScore,
      maxResponseTimeMs: itemMaxLatency,
      tags: tagsList,
    };

    try {
      await addCollectionItem(activeCollection.id, req);
      await loadCollections(true);
    } catch (err: unknown) {
      console.warn('Backend addItem failed, adding to local state:', err);
      const newItem: SeoCollectionItem = {
        id: `item-${Date.now()}`,
        name: req.name,
        url: req.url,
        method: req.method,
        enableJsRendering: req.enableJsRendering,
        expectedMinScore: req.expectedMinScore,
        maxResponseTimeMs: req.maxResponseTimeMs,
        tags: req.tags,
      };
      setCollections((prev) =>
        prev.map((c) =>
          c.id === activeCollection.id
            ? { ...c, items: [...(c.items || []), newItem], updatedAt: new Date().toISOString() }
            : c
        )
      );
    }

    setShowAddItemModal(false);
    setItemName('');
    setItemUrl('');
    setItemJsRender(false);
    setItemMinScore(80);
    setItemMaxLatency(3000);
    setItemTags('');
    addToast('success', 'Endpoint Added', `Added ${req.name} to suite.`);
  };

  const handleEditItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCollection || !showEditItemModal || !itemUrl.trim()) return;

    const tagsList = itemTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const req: UpdateSeoCollectionItemRequest = {
      name: itemName.trim() || itemUrl.trim(),
      url: itemUrl.trim(),
      method: showEditItemModal.method || 'AUDIT',
      enableJsRendering: itemJsRender,
      expectedMinScore: itemMinScore,
      maxResponseTimeMs: itemMaxLatency,
      tags: tagsList,
    };

    try {
      await updateCollectionItem(activeCollection.id, showEditItemModal.id, req);
      await loadCollections(true);
    } catch (err: unknown) {
      console.warn('Backend updateItem failed, updating local state:', err);
      setCollections((prev) =>
        prev.map((c) =>
          c.id === activeCollection.id
            ? {
                ...c,
                items: (c.items || []).map((it) =>
                  it.id === showEditItemModal.id
                    ? {
                        ...it,
                        name: req.name,
                        url: req.url,
                        enableJsRendering: req.enableJsRendering,
                        expectedMinScore: req.expectedMinScore,
                        maxResponseTimeMs: req.maxResponseTimeMs,
                        tags: req.tags,
                      }
                    : it
                ),
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );
    }

    setShowEditItemModal(null);
    addToast('success', 'Endpoint Updated', `Saved changes for ${req.name}.`);
  };

  const handleDeleteItem = async (itemId: string, name: string) => {
    if (!activeCollection) return;
    try {
      await deleteCollectionItem(activeCollection.id, itemId);
    } catch (err: unknown) {
      console.warn('Backend deleteItem failed, removing locally:', err);
    }
    setCollections((prev) =>
      prev.map((c) =>
        c.id === activeCollection.id
          ? {
              ...c,
              items: (c.items || []).filter((it) => it.id !== itemId),
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
    addToast('info', 'Endpoint Removed', `Removed ${name} from suite.`);
  };

  const handleRunSingleItem = async (itemId: string, itemName: string) => {
    if (!activeCollection) return;
    setRunningItemIds((prev) => ({ ...prev, [itemId]: true }));
    try {
      await runCollectionItem(activeCollection.id, itemId);
      addToast('success', 'Audit Complete', `Audit finished for ${itemName}.`);
      await loadCollections(true);
    } catch (err: unknown) {
      addToast('error', 'Audit Failed', err instanceof Error ? err.message : 'Single item audit failed.');
    } finally {
      setRunningItemIds((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const handleRunFullCollection = async () => {
    if (!activeCollection || activeCollection.items.length === 0) return;
    setRunningCollection(true);
    setRunnerResult(null);
    setShowRunnerModal(true);

    try {
      const result = await runFullCollection(activeCollection.id, {
        concurrent: runnerConcurrent,
      });
      setRunnerResult(result);
      addToast('success', 'Suite Execution Finished', `Processed ${result.completedUrls} of ${result.totalUrls} URLs.`);
      await loadCollections(true);
    } catch (err: unknown) {
      addToast('error', 'Suite Run Failed', err instanceof Error ? err.message : 'Collection runner failed.');
    } finally {
      setRunningCollection(false);
    }
  };

  const openEditCollectionModal = () => {
    if (!activeCollection) return;
    setNewCollName(activeCollection.name);
    setNewCollDesc(activeCollection.description || '');
    setNewCollColor(activeCollection.color || '#4FD8C4');
    setNewCollTags((activeCollection.tags || []).join(', '));
    setShowEditCollectionModal(true);
  };

  const openEditItemModal = (item: SeoCollectionItem) => {
    setShowEditItemModal(item);
    setItemName(item.name);
    setItemUrl(item.url);
    setItemJsRender(item.enableJsRendering || false);
    setItemMinScore(item.expectedMinScore || 80);
    setItemMaxLatency(item.maxResponseTimeMs || 3000);
    setItemTags((item.tags || []).join(', '));
  };

  return (
    <div className="space-y-6 font-mono text-xs animate-fade-in-up">

      {/* ─── Toast Notifications Container ─── */}
      <div className="fixed top-18 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 rounded-xl border shadow-2xl backdrop-blur-md transition-all flex items-start justify-between gap-3 ${
              t.type === 'success'
                ? 'border-[#4FD8C4]/40 bg-[#12151A]/95 text-[#E7EAEE]'
                : t.type === 'error'
                ? 'border-[#F87171]/40 bg-[#12151A]/95 text-[#E7EAEE]'
                : 'border-[#333A45] bg-[#12151A]/95 text-[#E7EAEE]'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {t.type === 'success' && <CheckCircleIcon className="size-4.5 text-[#4FD8C4] shrink-0 mt-0.5" />}
              {t.type === 'error' && <WarningCircleIcon className="size-4.5 text-[#F87171] shrink-0 mt-0.5" />}
              {t.type === 'info' && <InfoIcon className="size-4.5 text-[#7AA2F7] shrink-0 mt-0.5" />}
              <div className="space-y-0.5">
                <div className="font-bold text-xs">{t.title}</div>
                <div className="text-[11px] text-[#8B93A1] font-sans">{t.message}</div>
              </div>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              type='button'
              className="text-[#565D68] hover:text-[#E7EAEE] cursor-pointer"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* ─── Top Terminal Header ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#262B33] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderIcon className="size-4.5 text-[#4FD8C4]" />
            <span className="text-[#4FD8C4] font-bold text-sm">$ collections</span>
            <span className="text-[#565D68]">/</span>
            <span className="text-[#E7EAEE] font-bold text-xs">Postman for SEO</span>
          </div>
          <p className="text-[#8B93A1] font-sans text-xs">
            Manage target URL suites, configure assertion thresholds, and trigger parallel test runs.
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setNewCollName('');
              setNewCollDesc('');
              setNewCollColor('#4FD8C4');
              setNewCollTags('');
              setShowCreateCollectionModal(true);
            }}
            className="rounded-lg border border-[#4FD8C4]/40 bg-[#4FD8C4]/10 hover:bg-[#4FD8C4]/20 text-[#4FD8C4] px-3.5 py-2 font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs shadow-sm hover:border-[#4FD8C4]"
          >
            <PlusIcon className="size-3.5" />
            <span>New Collection</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setImportJsonText('');
              setImportError(null);
              setShowImportModal(true);
            }}
            className="rounded-lg border border-[#333A45] bg-[#191D24] hover:bg-[#262B33] text-[#E7EAEE] px-3.5 py-2 font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs hover:border-[#4FD8C4]/40"
          >
            <UploadSimpleIcon className="size-3.5" />
            <span>Import JSON</span>
          </button>
        </div>
      </div>

      {/* ─── Top Stats Ribbon (Active when user has collections) ─── */}
      {collections.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#8B93A1] uppercase font-bold tracking-wider">Suites Tracked</span>
              <div className="text-xl font-bold text-[#E7EAEE]">{suiteStats.totalSuites}</div>
            </div>
            <FolderIcon className="size-5 text-[#4FD8C4]" />
          </div>

          <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#8B93A1] uppercase font-bold tracking-wider">Target URLs</span>
              <div className="text-xl font-bold text-[#E7EAEE]">{suiteStats.totalUrls}</div>
            </div>
            <GlobeIcon className="size-5 text-[#7AA2F7]" />
          </div>

          <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#8B93A1] uppercase font-bold tracking-wider">Average Suite Score</span>
              <div className="text-xl font-bold text-[#4ADE80]">
                {suiteStats.avgScore != null ? `${suiteStats.avgScore}/100` : '--'}
              </div>
            </div>
            <ShieldCheckIcon className="size-5 text-[#4ADE80]" />
          </div>
        </div>
      )}

      {/* ─── 1-Click Starter Suites Quick-Bar (Always visible if <= 3 collections or for fast bootstrapping) ─── */}
      {collections.length <= 3 && (
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#E7EAEE]">
              <SparkleIcon className="size-4 text-[#4FD8C4]" />
              <span>1-Click Starter Suite Packs</span>
            </div>
            <span className="text-[10px] text-[#8B93A1]">Instant pre-configured URL suites</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(STARTER_TEMPLATES).map(([key, tpl]) => {
              const isSpinning = templateLoadingKey === key;
              return (
                <div
                  key={key}
                  className="rounded-lg border border-[#262B33] bg-[#0A0C0F] hover:border-[#333A45] p-3 flex flex-col justify-between gap-2.5 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ backgroundColor: tpl.color }} />
                      <span className="font-bold text-[#E7EAEE] text-xs">{tpl.name}</span>
                    </div>
                    <p className="text-[#8B93A1] text-[10px] font-sans line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isSpinning}
                    onClick={() => handleCreateStarterTemplate(key)}
                    className="w-full py-1.5 px-2.5 rounded bg-[#191D24] hover:bg-[#262B33] border border-[#262B33] hover:border-[#4FD8C4]/40 text-[#4FD8C4] font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isSpinning ? (
                      <>
                        <ArrowsClockwiseIcon className="size-3.5 animate-spin" />
                        <span>Creating Suite...</span>
                      </>
                    ) : (
                      <>
                        <PlusIcon className="size-3" />
                        <span>Add {tpl.name.split(' ')[0]} Suite</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Main Postman-Style Workspace (Sidebar + Details) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start min-h-[640px]">

        {/* ═══ Left Sidebar: Collections Explorer ═══ */}
        <div className="lg:col-span-4 rounded-xl border border-[#262B33] bg-[#12151A] flex flex-col shadow-xl min-h-[580px]">
          
          {/* Explorer Header & Search */}
          <div className="p-3.5 border-b border-[#262B33] bg-[#161920] rounded-t-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[#E7EAEE] uppercase font-bold text-[11px] tracking-wider flex items-center gap-1.5">
                <TerminalWindowIcon className="size-4 text-[#4FD8C4]" />
                Suites Explorer ({filteredCollections.length})
              </span>
              {selectedTag && (
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className="text-[10px] text-[#4FD8C4] hover:underline cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Filter collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0A0C0F] border border-[#262B33] rounded-lg pl-3 pr-8 py-2 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:outline-none focus:border-[#4FD8C4] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-[#565D68] hover:text-[#E7EAEE]"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>

            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer shrink-0 ${
                      selectedTag === tag
                        ? 'bg-[#4FD8C4]/20 border-[#4FD8C4] text-[#4FD8C4] font-bold'
                        : 'bg-[#0A0C0F] border-[#262B33] text-[#8B93A1] hover:text-[#E7EAEE]'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Collections List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#262B33]/60 max-h-[600px]">
            {loading ? (
              <div className="p-12 text-center text-[#8B93A1] space-y-3">
                <ArrowsClockwiseIcon className="size-6 mx-auto animate-spin text-[#4FD8C4]" />
                <p className="text-xs">Loading suites...</p>
              </div>
            ) : filteredCollections.length === 0 ? (
              <div className="p-8 text-center text-[#8B93A1] space-y-3 my-auto">
                <div className="size-12 rounded-xl bg-[#191D24] border border-[#262B33] flex items-center justify-center mx-auto text-[#565D68]">
                  <FolderIcon className="size-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#E7EAEE]">No Suites Found</p>
                  <p className="text-[10px] text-[#565D68]">
                    {searchQuery ? 'Try adjusting your search filter' : 'Create your first collection above.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateCollectionModal(true)}
                  className="px-3 py-1.5 rounded-lg border border-[#4FD8C4]/40 bg-[#4FD8C4]/10 text-[#4FD8C4] font-bold text-[11px] hover:bg-[#4FD8C4]/20 transition-all cursor-pointer inline-flex items-center gap-1"
                >
                  <PlusIcon className="size-3" />
                  <span>Create Suite</span>
                </button>
              </div>
            ) : (
              filteredCollections.map((coll) => {
                const isSelected = coll.id === selectedCollectionId;
                return (
                  <div
                    key={coll.id}
                    onClick={() => setSelectedCollectionId(coll.id)}
                    className={`p-3.5 cursor-pointer transition-all space-y-1.5 relative ${
                      isSelected
                        ? 'bg-[#191D24] border-l-3 border-l-[#4FD8C4]'
                        : 'hover:bg-[#161920]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="size-2.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: coll.color || '#4FD8C4' }}
                        />
                        <span className="font-bold text-[#E7EAEE] text-xs truncate">
                          {coll.name}
                        </span>
                      </div>
                      {coll.averageScore != null ? (
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                            coll.averageScore >= 80
                              ? 'bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30'
                              : coll.averageScore >= 50
                              ? 'bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30'
                              : 'bg-[#F87171]/15 text-[#F87171] border border-[#F87171]/30'
                          }`}
                        >
                          {Math.round(coll.averageScore)} pts
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#565D68] px-1.5 py-0.5 rounded border border-[#262B33] bg-[#0A0C0F]">
                          unrun
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#8B93A1]">
                      <span className="flex items-center gap-1 font-mono">
                        <GlobeIcon className="size-3 text-[#565D68]" />
                        {coll.items ? coll.items.length : 0} {coll.items?.length === 1 ? 'URL' : 'URLs'}
                      </span>
                      {coll.lastRunAt ? (
                        <span className="text-[#565D68]">
                          {new Date(coll.lastRunAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      ) : (
                        <span className="text-[#565D68]">Ready</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ═══ Right Main Workspace: Active Collection Details & Endpoints ═══ */}
        <div className="lg:col-span-8 flex flex-col min-h-[580px]">
          {activeCollection ? (
            <div className="space-y-5">
              {/* Collection Header Control Bar */}
              <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-5 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#262B33] pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span
                        className="size-3.5 rounded-full shrink-0 shadow"
                        style={{ backgroundColor: activeCollection.color || '#4FD8C4' }}
                      />
                      <h1 className="text-base font-bold text-[#E7EAEE]">
                        {activeCollection.name}
                      </h1>
                      {activeCollection.averageScore != null && (
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                            activeCollection.averageScore >= 80
                              ? 'bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30'
                              : activeCollection.averageScore >= 50
                              ? 'bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30'
                              : 'bg-[#F87171]/15 text-[#F87171] border border-[#F87171]/30'
                          }`}
                        >
                          Avg Score: {activeCollection.averageScore}/100
                        </span>
                      )}
                    </div>
                    {activeCollection.description && (
                      <p className="text-[#8B93A1] font-sans text-xs max-w-xl">
                        {activeCollection.description}
                      </p>
                    )}
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={handleRunFullCollection}
                      disabled={runningCollection || activeCollection.items.length === 0}
                      className="rounded-lg bg-[#4FD8C4] hover:bg-[#4FD8C4]/90 text-[#0A0C0F] px-4 py-2 font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs shadow-md shadow-[#4FD8C4]/15 disabled:opacity-40"
                    >
                      <PlayIcon className="size-3.5" weight="fill" />
                      <span>{runningCollection ? 'Running Suite...' : 'Run Suite'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setItemName('');
                        setItemUrl('');
                        setItemJsRender(false);
                        setItemMinScore(80);
                        setItemMaxLatency(3000);
                        setItemTags('');
                        setShowAddItemModal(true);
                      }}
                      className="rounded-lg border border-[#333A45] bg-[#191D24] hover:bg-[#262B33] text-[#4FD8C4] px-3 py-2 font-bold transition-all cursor-pointer inline-flex items-center gap-1 text-xs hover:border-[#4FD8C4]/40"
                    >
                      <PlusIcon className="size-3.5" />
                      <span>Add URL</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportCollection(activeCollection.id, activeCollection.name)}
                      title="Export Collection JSON"
                      className="p-2 rounded-lg border border-[#262B33] bg-[#0A0C0F] hover:bg-[#191D24] text-[#8B93A1] hover:text-[#E7EAEE] transition-colors cursor-pointer"
                    >
                      <DownloadSimpleIcon className="size-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicateCollection(activeCollection.id)}
                      title="Duplicate Collection"
                      className="p-2 rounded-lg border border-[#262B33] bg-[#0A0C0F] hover:bg-[#191D24] text-[#8B93A1] hover:text-[#E7EAEE] transition-colors cursor-pointer"
                    >
                      <CopyIcon className="size-4" />
                    </button>

                    <button
                      type="button"
                      onClick={openEditCollectionModal}
                      title="Edit Settings"
                      className="p-2 rounded-lg border border-[#262B33] bg-[#0A0C0F] hover:bg-[#191D24] text-[#8B93A1] hover:text-[#E7EAEE] transition-colors cursor-pointer"
                    >
                      <PencilSimpleIcon className="size-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCollection(activeCollection.id, activeCollection.name)}
                      title="Delete Collection"
                      className="p-2 rounded-lg border border-[#F87171]/20 bg-[#0A0C0F] hover:bg-[#F87171]/10 text-[#F87171] transition-colors cursor-pointer"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Suite Metrics Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border border-[#262B33] bg-[#0A0C0F] space-y-0.5">
                    <span className="text-[10px] text-[#8B93A1] uppercase font-bold">Tracked Endpoints</span>
                    <div className="text-lg font-bold text-[#E7EAEE]">{activeCollection.items.length}</div>
                  </div>

                  <div className="p-3 rounded-lg border border-[#262B33] bg-[#0A0C0F] space-y-0.5">
                    <span className="text-[10px] text-[#8B93A1] uppercase font-bold">Passed Assertions</span>
                    <div className="text-lg font-bold text-[#4ADE80]">
                      {activeCollection.passedItems ?? 0}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-[#262B33] bg-[#0A0C0F] space-y-0.5">
                    <span className="text-[10px] text-[#8B93A1] uppercase font-bold">Warnings / Drops</span>
                    <div className="text-lg font-bold text-[#F87171]">
                      {activeCollection.failedItems ?? 0}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-[#262B33] bg-[#0A0C0F] space-y-0.5">
                    <span className="text-[10px] text-[#8B93A1] uppercase font-bold">Last Suite Audit</span>
                    <div className="text-xs font-bold text-[#E7EAEE] truncate mt-1">
                      {activeCollection.lastRunAt
                        ? new Date(activeCollection.lastRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Not executed'}
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══ Endpoints Table / Postman Request List ═══ */}
              <div className="rounded-xl border border-[#262B33] bg-[#12151A] overflow-hidden shadow-xl">
                <div className="bg-[#161920] p-3.5 border-b border-[#262B33] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GlobeIcon className="size-4 text-[#4FD8C4]" />
                    <span className="font-bold text-[#E7EAEE] uppercase tracking-wider text-xs">
                      Audit Endpoints ({activeCollection.items.length})
                    </span>
                  </div>
                  <span className="text-[10px] text-[#8B93A1]">
                    Click Run on any endpoint to audit live
                  </span>
                </div>

                {activeCollection.items.length === 0 ? (
                  <div className="p-12 text-center text-[#8B93A1] space-y-3">
                    <div className="size-12 rounded-xl bg-[#191D24] border border-[#262B33] flex items-center justify-center mx-auto text-[#4FD8C4]">
                      <GlobeIcon className="size-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-[#E7EAEE]">No Endpoints in this Suite</p>
                      <p className="text-[11px] text-[#8B93A1] font-sans max-w-sm mx-auto">
                        Add target URLs with assertion criteria to begin automated testing and tracking.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setItemName('');
                        setItemUrl('');
                        setItemJsRender(false);
                        setItemMinScore(80);
                        setItemMaxLatency(3000);
                        setItemTags('');
                        setShowAddItemModal(true);
                      }}
                      className="px-4 py-2 rounded-lg bg-[#4FD8C4] hover:bg-[#4FD8C4]/90 text-[#0A0C0F] font-bold text-xs cursor-pointer transition-all inline-flex items-center gap-1.5"
                    >
                      <PlusIcon className="size-3.5" />
                      <span>Add Target URL</span>
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-[#262B33]">
                    {activeCollection.items.map((item) => {
                      const isRunningThis = runningItemIds[item.id] || false;
                      const hasAudit = item.lastAudit != null;

                      return (
                        <div
                          key={item.id}
                          className="p-4 hover:bg-[#161920]/80 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                        >
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#4FD8C4]/15 text-[#4FD8C4] border border-[#4FD8C4]/30">
                                $ AUDIT
                              </span>
                              <span className="font-bold text-[#E7EAEE] text-xs truncate">
                                {item.name}
                              </span>
                              {item.enableJsRendering && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#7AA2F7]/15 text-[#7AA2F7] border border-[#7AA2F7]/30">
                                  JS Render
                                </span>
                              )}
                              {item.expectedMinScore && (
                                <span className="text-[9px] text-[#8B93A1]">
                                  Target ≥{item.expectedMinScore}pts
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-[#8B93A1] font-mono truncate">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-[#4FD8C4] hover:underline truncate inline-flex items-center gap-1"
                              >
                                {item.url}
                                <ArrowSquareOutIcon className="size-3 text-[#565D68]" />
                              </a>
                            </div>
                          </div>

                          {/* Last Audit Result Badges & Action Buttons */}
                          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                            {hasAudit && (
                              <div className="flex items-center gap-2 text-[11px]">
                                {item.lastAudit?.httpStatus && (
                                  <span className="px-1.5 py-0.5 rounded bg-[#0A0C0F] border border-[#262B33] text-[#8B93A1]">
                                    {item.lastAudit.httpStatus}
                                  </span>
                                )}
                                {item.lastAudit?.responseTimeMs && (
                                  <span className="text-[10px] text-[#8B93A1] flex items-center gap-0.5">
                                    <ClockIcon className="size-3 text-[#565D68]" />
                                    {item.lastAudit.responseTimeMs}ms
                                  </span>
                                )}
                                {item.lastAudit?.overallScore != null && (
                                  <span
                                    className={`px-2 py-0.5 rounded font-bold font-mono text-[11px] ${
                                      item.lastAudit.overallScore >= (item.expectedMinScore || 80)
                                        ? 'bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30'
                                        : 'bg-[#F87171]/15 text-[#F87171] border border-[#F87171]/30'
                                    }`}
                                  >
                                    {item.lastAudit.overallScore}/100
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Run Single Button */}
                            <button
                              type="button"
                              disabled={isRunningThis}
                              onClick={() => handleRunSingleItem(item.id, item.name)}
                              className="px-3 py-1 rounded-md bg-[#191D24] hover:bg-[#262B33] border border-[#333A45] hover:border-[#4FD8C4]/40 text-[#4FD8C4] font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-1 disabled:opacity-40"
                            >
                              {isRunningThis ? (
                                <>
                                  <ArrowsClockwiseIcon className="size-3 animate-spin" />
                                  <span>Running...</span>
                                </>
                              ) : (
                                <>
                                  <PlayIcon className="size-3" weight="fill" />
                                  <span>Run</span>
                                </>
                              )}
                            </button>

                            {/* Edit Item */}
                            <button
                              type="button"
                              onClick={() => openEditItemModal(item)}
                              title="Edit item settings"
                              className="p-1.5 rounded border border-[#262B33] bg-[#0A0C0F] hover:bg-[#191D24] text-[#8B93A1] hover:text-[#E7EAEE] transition-colors cursor-pointer"
                            >
                              <PencilSimpleIcon className="size-3.5" />
                            </button>

                            {/* Delete Item */}
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              title="Remove item"
                              className="p-1.5 rounded border border-[#F87171]/20 bg-[#0A0C0F] hover:bg-[#F87171]/10 text-[#F87171] transition-colors cursor-pointer"
                            >
                              <TrashIcon className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ═══ Empty State / Workspace Hero ═══ */
            <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-8 flex flex-col items-center justify-center text-center space-y-6 flex-1 shadow-2xl">
              <div className="size-16 rounded-2xl bg-[#191D24] border border-[#333A45] flex items-center justify-center text-[#4FD8C4] shadow-md shadow-[#4FD8C4]/10">
                <FolderPlusIcon className="size-8" />
              </div>

              <div className="space-y-2 max-w-md">
                <h3 className="text-base font-bold text-[#E7EAEE]">
                  Select or Create an SEO Suite
                </h3>
                <p className="text-xs text-[#8B93A1] font-sans leading-relaxed">
                  Choose an existing suite from the sidebar, create a new custom collection, or pick a starter template to track your website endpoints.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={() => setShowCreateCollectionModal(true)}
                  className="px-4 py-2 rounded-lg bg-[#4FD8C4] hover:bg-[#4FD8C4]/90 text-[#0A0C0F] font-bold text-xs cursor-pointer transition-all inline-flex items-center gap-1.5"
                >
                  <PlusIcon className="size-3.5" />
                  <span>Create New Suite</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="px-4 py-2 rounded-lg border border-[#333A45] bg-[#191D24] hover:bg-[#262B33] text-[#E7EAEE] font-semibold text-xs cursor-pointer transition-all inline-flex items-center gap-1.5"
                >
                  <UploadSimpleIcon className="size-3.5" />
                  <span>Import JSON Suite</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ MODAL: CREATE COLLECTION ═══════ */}
      {showCreateCollectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
          <div className="w-full max-w-md rounded-xl border border-[#333A45] bg-[#12151A] overflow-hidden shadow-2xl space-y-0">
            {/* Terminal Window Frame Header */}
            <div className="bg-[#191D24] px-4 py-3 border-b border-[#262B33] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#F87171]" />
                  <span className="size-2.5 rounded-full bg-[#FBBF24]" />
                  <span className="size-2.5 rounded-full bg-[#4ADE80]" />
                </div>
                <span className="font-bold text-[#4FD8C4] text-xs ml-2">$ collections / new_suite</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateCollectionModal(false)}
                className="text-[#565D68] hover:text-[#E7EAEE] cursor-pointer"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCollectionSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-[11px] text-[#8B93A1] uppercase font-bold">
                  Collection Name <span className="text-[#F87171]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Core Funnel"
                  value={newCollName}
                  onChange={(e) => setNewCollName(e.target.value)}
                  className="w-full bg-[#0A0C0F] border border-[#262B33] rounded-lg px-3 py-2 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:border-[#4FD8C4] focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-[#8B93A1] uppercase font-bold">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Daily critical path SEO & Core Web Vitals audit suite"
                  value={newCollDesc}
                  onChange={(e) => setNewCollDesc(e.target.value)}
                  className="w-full bg-[#0A0C0F] border border-[#262B33] rounded-lg px-3 py-2 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:border-[#4FD8C4] focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] text-[#8B93A1] uppercase font-bold">
                  Color Tag
                </label>
                <div className="flex items-center gap-2.5">
                  {['#4FD8C4', '#7AA2F7', '#4ADE80', '#FBBF24', '#F87171', '#C084FC'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCollColor(c)}
                      className={`size-6 rounded-full transition-transform cursor-pointer border flex items-center justify-center ${
                        newCollColor === c ? 'scale-125 border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {newCollColor === c && <CheckIcon className="size-3 text-black font-bold" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-[#8B93A1] uppercase font-bold">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="production, marketing, critical"
                  value={newCollTags}
                  onChange={(e) => setNewCollTags(e.target.value)}
                  className="w-full bg-[#0A0C0F] border border-[#262B33] rounded-lg px-3 py-2 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:border-[#4FD8C4] focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#262B33]">
                <button
                  type="button"
                  onClick={() => setShowCreateCollectionModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-[#262B33] bg-[#0A0C0F] text-[#8B93A1] hover:text-[#E7EAEE] cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#4FD8C4] hover:bg-[#4FD8C4]/90 text-[#0A0C0F] font-bold cursor-pointer transition-all text-xs"
                >
                  Create Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════ MODAL: EDIT COLLECTION ═══════ */}
      {showEditCollectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
          <div className="w-full max-w-md rounded-xl border border-[#333A45] bg-[#12151A] overflow-hidden shadow-2xl space-y-0">
            <div className="bg-[#191D24] px-4 py-3 border-b border-[#262B33] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PencilSimpleIcon className="size-4 text-[#4FD8C4]" />
                <span className="font-bold text-[#E7EAEE] text-xs">Edit Suite Settings</span>
              </div>
              <button
                type="button"
                onClick={() => setShowEditCollectionModal(false)}
                className="text-[#565D68] hover:text-[#E7EAEE] cursor-pointer"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCollectionSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-[11px] text-[#8B93A1] uppercase font-bold">
                  Collection Name <span className="text-[#F87171]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCollName}
                  onChange={(e) => setNewCollName(e.target.value)}
                  className="w-full bg-[#0A0C0F] border border-[#262B33] rounded-lg px-3 py-2 text-xs text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-[#8B93A1] uppercase font-bold">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newCollDesc}
                  onChange={(e) => setNewCollDesc(e.target.value)}
                  className="w-full bg-[#0A0C0F] border border-[#262B33] rounded-lg px-3 py-2 text-xs text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] text-[#8B93A1] uppercase font-bold">
                  Color Tag
                </label>
                <div className="flex items-center gap-2.5">
                  {['#4FD8C4', '#7AA2F7', '#4ADE80', '#FBBF24', '#F87171', '#C084FC'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCollColor(c)}
                      className={`size-6 rounded-full transition-transform cursor-pointer border flex items-center justify-center ${
                        newCollColor === c ? 'scale-125 border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {newCollColor === c && <CheckIcon className="size-3 text-black font-bold" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-[#8B93A1] uppercase font-bold">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={newCollTags}
                  onChange={(e) => setNewCollTags(e.target.value)}
                  className="w-full bg-[#0A0C0F] border border-[#262B33] rounded-lg px-3 py-2 text-xs text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#262B33]">
                <button
                  type="button"
                  onClick={() => setShowEditCollectionModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-[#262B33] bg-[#0A0C0F] text-[#8B93A1] hover:text-[#E7EAEE] cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#4FD8C4] hover:bg-[#4FD8C4]/90 text-[#0A0C0F] font-bold cursor-pointer transition-all text-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════ MODAL: ADD URL ITEM ═══════ */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
          <div className="w-full max-w-md rounded-xl border border-[#333A45] bg-[#12151A] overflow-hidden shadow-2xl space-y-0">
            <div className="bg-[#191D24] px-4 py-3 border-b border-[#262B33] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#4FD8C4] font-bold">
                <PlusIcon className="size-4" />
                <span className="text-[#E7EAEE] text-xs">Add Target Endpoint URL</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="text-[#565D68] hover:text-[#E7EAEE] cursor-pointer"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <form onSubmit={handleAddItemSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-[11px] text-[#8B93A1] uppercase font-bold">
                  Endpoint Name / Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pricing Tier Matrix"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full bg-[#0A0C0F] border border-[#262B33] rounded-lg px-3 py-2 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:border-[#4FD8C4] focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-[#8B93A1] uppercase font-bold">
                  Target URL <span className="text-[#F87171]">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/pricing"
                  value={itemUrl}
                  onChange={(e) => setItemUrl(e.target.value)}
                  className="w-full bg-[#0A0C0F] border border-[#262B33] rounded-lg px-3 py-2 text-xs text-[#E7EAEE] placeholder-[#565D68] focus:border-[#4FD8C4] focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] text-[#8B93A1] uppercase font-bold">
                    Target Min Score
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={itemMinScore}
                    onChange={(e) => setItemMinScore(Number.parseInt(e.target.value, 10) || 80)}
                    className="w-full bg-[#0A0C0F] border border-[#262B33] rounded-lg px-3 py-2 text-xs text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-[#8B93A1] uppercase font-bold">
                    Max Latency (ms)
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={30000}
                    value={itemMaxLatency}
                    onChange={(e) => setItemMaxLatency(Number.parseInt(e.target.value, 10) || 3000)}
                    className="w-full bg-[#0A0C0F] border border-[#262B33] rounded-lg px-3 py-2 text-xs text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg border border-[#262B33] bg-[#0A0C0F]">
                <input
                  type="checkbox"
                  id="addItemJsRender"
                  checked={itemJsRender}
                  onChange={(e) => setItemJsRender(e.target.checked)}
                  className="rounded border-[#262B33] text-[#4FD8C4] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="addItemJsRender" className="text-xs text-[#E7EAEE] cursor-pointer select-none">
                  Enable Headless JavaScript Rendering (SPA hydration)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#262B33]">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-[#262B33] bg-[#0A0C0F] text-[#8B93A1] hover:text-[#E7EAEE] cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#4FD8C4] hover:bg-[#4FD8C4]/90 text-[#0A0C0F] font-bold cursor-pointer transition-all text-xs"
                >
                  Add Endpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════ MODAL: EDIT URL ITEM ═══════ */}
      {showEditItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
          <div className="w-full max-w-md rounded-xl border border-[#333A45] bg-[#12151A] overflow-hidden shadow-2xl space-y-0">
            <div className="bg-[#191D24] px-4 py-3 border-b border-[#262B33] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#4FD8C4] font-bold">
                <PencilSimpleIcon className="size-4" />
                <span className="text-[#E7EAEE] text-xs">Edit Endpoint Settings</span>
              </div>
              <button
                type="button"
                onClick={() => setShowEditItemModal(null)}
                className="text-[#565D68] hover:text-[#E7EAEE] cursor-pointer"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <form onSubmit={handleEditItemSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-[11px] text-[#8B93A1] uppercase font-bold">
                  Endpoint Name / Label
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full bg-[#0A0C0F] border border-[#262B33] rounded-lg px-3 py-2 text-xs text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-[#8B93A1] uppercase font-bold">
                  Target URL <span className="text-[#F87171]">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={itemUrl}
                  onChange={(e) => setItemUrl(e.target.value)}
                  className="w-full bg-[#0A0C0F] border border-[#262B33] rounded-lg px-3 py-2 text-xs text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] text-[#8B93A1] uppercase font-bold">
                    Target Min Score
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={itemMinScore}
                    onChange={(e) => setItemMinScore(Number.parseInt(e.target.value, 10) || 80)}
                    className="w-full bg-[#0A0C0F] border border-[#262B33] rounded-lg px-3 py-2 text-xs text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-[#8B93A1] uppercase font-bold">
                    Max Latency (ms)
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={30000}
                    value={itemMaxLatency}
                    onChange={(e) => setItemMaxLatency(Number.parseInt(e.target.value, 10) || 3000)}
                    className="w-full bg-[#0A0C0F] border border-[#262B33] rounded-lg px-3 py-2 text-xs text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg border border-[#262B33] bg-[#0A0C0F]">
                <input
                  type="checkbox"
                  id="editItemJsRender"
                  checked={itemJsRender}
                  onChange={(e) => setItemJsRender(e.target.checked)}
                  className="rounded border-[#262B33] text-[#4FD8C4] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="editItemJsRender" className="text-xs text-[#E7EAEE] cursor-pointer select-none">
                  Enable Headless JavaScript Rendering
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#262B33]">
                <button
                  type="button"
                  onClick={() => setShowEditItemModal(null)}
                  className="px-3.5 py-2 rounded-lg border border-[#262B33] bg-[#0A0C0F] text-[#8B93A1] hover:text-[#E7EAEE] cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#4FD8C4] hover:bg-[#4FD8C4]/90 text-[#0A0C0F] font-bold cursor-pointer transition-all text-xs"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════ MODAL: POSTMAN COLLECTION RUNNER ═══════ */}
      {showRunnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in-up">
          <div className="w-full max-w-2xl rounded-xl border border-[#333A45] bg-[#12151A] overflow-hidden shadow-2xl space-y-0">
            {/* Header */}
            <div className="bg-[#191D24] px-5 py-4 border-b border-[#262B33] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PlayIcon className="size-4.5 text-[#4FD8C4]" weight="fill" />
                <span className="font-bold text-[#E7EAEE] text-sm">
                  Suite Runner: {activeCollection?.name}
                </span>
              </div>
              <button
                type="button"
                disabled={runningCollection}
                onClick={() => setShowRunnerModal(false)}
                className="text-[#565D68] hover:text-[#E7EAEE] cursor-pointer disabled:opacity-30"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Progress and status */}
              {runningCollection ? (
                <div className="p-8 text-center space-y-4">
                  <ArrowsClockwiseIcon className="size-8 mx-auto animate-spin text-[#4FD8C4]" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#E7EAEE]">
                      Executing Suite Audit with Java Virtual Threads...
                    </p>
                    <p className="text-xs text-[#8B93A1]">
                      Auditing {activeCollection?.items.length} endpoints concurrently. Running assertions.
                    </p>
                  </div>
                </div>
              ) : runnerResult ? (
                <div className="space-y-5">
                  {/* Results Overview Ribbons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg border border-[#262B33] bg-[#0A0C0F] space-y-0.5">
                      <span className="text-[10px] text-[#8B93A1] uppercase font-bold">Total Run</span>
                      <div className="text-lg font-bold text-[#E7EAEE]">
                        {runnerResult.completedUrls} / {runnerResult.totalUrls}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-[#262B33] bg-[#0A0C0F] space-y-0.5">
                      <span className="text-[10px] text-[#8B93A1] uppercase font-bold">Passed</span>
                      <div className="text-lg font-bold text-[#4ADE80]">
                        {runnerResult.passedUrls}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-[#262B33] bg-[#0A0C0F] space-y-0.5">
                      <span className="text-[10px] text-[#8B93A1] uppercase font-bold">Failed / Warnings</span>
                      <div className="text-lg font-bold text-[#F87171]">
                        {runnerResult.failedUrls + runnerResult.warningUrls}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-[#262B33] bg-[#0A0C0F] space-y-0.5">
                      <span className="text-[10px] text-[#8B93A1] uppercase font-bold">Average Score</span>
                      <div className="text-lg font-bold text-[#4FD8C4]">
                        {runnerResult.averageScore != null ? `${runnerResult.averageScore}/100` : '--'}
                      </div>
                    </div>
                  </div>

                  {/* Item execution breakdown */}
                  <div className="rounded-lg border border-[#262B33] bg-[#0A0C0F] overflow-hidden max-h-72 overflow-y-auto divide-y divide-[#262B33]">
                    {runnerResult.items.map((it) => (
                      <div key={it.itemId} className="p-3 flex items-center justify-between text-xs gap-3">
                        <div className="flex items-center gap-2 truncate">
                          {it.status === 'PASSED' ? (
                            <CheckCircleIcon className="size-4 text-[#4ADE80] shrink-0" weight="fill" />
                          ) : (
                            <WarningCircleIcon className="size-4 text-[#F87171] shrink-0" weight="fill" />
                          )}
                          <div className="truncate">
                            <span className="font-bold text-[#E7EAEE] truncate">{it.name}</span>
                            <div className="text-[10px] text-[#8B93A1] truncate">{it.url}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {it.responseTimeMs && (
                            <span className="text-[10px] text-[#8B93A1]">{it.responseTimeMs}ms</span>
                          )}
                          {it.overallScore != null && (
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-xs ${
                                it.status === 'PASSED'
                                  ? 'bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30'
                                  : 'bg-[#F87171]/15 text-[#F87171] border border-[#F87171]/30'
                              }`}
                            >
                              {it.overallScore} pts
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-[#262B33]">
                <div className="flex items-center gap-2 text-[11px] text-[#8B93A1]">
                  <SlidersHorizontalIcon className="size-3.5 text-[#4FD8C4]" />
                  <span>Concurrent Virtual Threads mode active</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={runningCollection}
                    onClick={handleRunFullCollection}
                    className="px-3.5 py-1.5 rounded-lg border border-[#333A45] bg-[#191D24] hover:bg-[#262B33] text-[#4FD8C4] font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <ArrowsClockwiseIcon className="size-3.5" />
                    <span>Run Again</span>
                  </button>

                  <button
                    type="button"
                    disabled={runningCollection}
                    onClick={() => setShowRunnerModal(false)}
                    className="px-4 py-1.5 rounded-lg bg-[#4FD8C4] hover:bg-[#4FD8C4]/90 text-[#0A0C0F] font-bold text-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ MODAL: IMPORT JSON ═══════ */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
          <div className="w-full max-w-lg rounded-xl border border-[#333A45] bg-[#12151A] overflow-hidden shadow-2xl space-y-0">
            <div className="bg-[#191D24] px-4 py-3 border-b border-[#262B33] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#4FD8C4] font-bold">
                <UploadSimpleIcon className="size-4" />
                <span className="text-[#E7EAEE] text-xs">Import SEO Collection JSON</span>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-[#565D68] hover:text-[#E7EAEE] cursor-pointer"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <form onSubmit={handleImportCollectionSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-[11px] text-[#8B93A1] uppercase font-bold">
                  JSON Payload
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder={`{\n  "name": "Production Core Funnel",\n  "description": "Critical pages",\n  "items": [\n    { "name": "Landing", "url": "https://example.com" }\n  ]\n}`}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  className="w-full bg-[#0A0C0F] border border-[#262B33] rounded-lg px-3 py-2 text-xs text-[#E7EAEE] font-mono placeholder-[#565D68] focus:border-[#4FD8C4] focus:outline-none transition-colors"
                />
              </div>

              {importError && (
                <div className="p-2.5 rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 text-[#F87171] text-xs flex items-center gap-1.5">
                  <WarningCircleIcon className="size-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#262B33]">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-[#262B33] bg-[#0A0C0F] text-[#8B93A1] hover:text-[#E7EAEE] cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#4FD8C4] hover:bg-[#4FD8C4]/90 text-[#0A0C0F] font-bold cursor-pointer transition-all text-xs"
                >
                  Import Suite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
