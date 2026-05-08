import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Lock, RefreshCcw, Loader2, CheckCircle2, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, apiErrorMessage } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Category } from '../types';

const DEFAULT_CATEGORIES = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Salário', 'Freelance', 'Investimentos', 'Serviços',
];

export default function Categories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', type: 'expense', icon: 'Tag', color: '#7C3AED' });
  const [editing, setEditing] = useState<Category | null>(null);

  const canManage = user?.plan === 'PRO';

  const fetchCategories = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/categories');
      setCategories(response.data || []);
    } catch (err: any) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [user?.id]);

  const defaultMessage = useMemo(() => {
    if (user?.plan === 'FREE') return 'Você pode ver as categorias padrão, mas a criação e edição avançada estão disponíveis apenas no Plano Pro.';
    if (user?.plan === 'BASIC') return 'Visualize categorias e filtros, mas o gerenciamento completo está disponível no Plano Pro.';
    return 'Gerencie categorias personalizadas para organizar receitas e despesas.';
  }, [user?.plan]);

  const resetForm = () => setNewCategory({ name: '', type: 'expense', icon: 'Tag', color: '#7C3AED' });

  const saveCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      if (editing) {
        const response = await api.put(`/api/categories/${editing.id}`, { ...newCategory });
        setCategories((current) => current.map((cat) => cat.id === editing.id ? response.data : cat));
        toast.success('Categoria atualizada!');
      } else {
        const response = await api.post('/api/categories', { ...newCategory });
        setCategories((current) => [response.data, ...current]);
        toast.success('Categoria criada!');
      }
      resetForm();
      setEditing(null);
    } catch (err: any) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (category: Category) => {
    if (!window.confirm(`Excluir categoria "${category.name}"?`)) return;
    try {
      await api.delete(`/api/categories/${category.id}`);
      setCategories((current) => current.filter((cat) => cat.id !== category.id));
      toast.success('Categoria removida!');
    } catch (err: any) {
      toast.error(apiErrorMessage(err));
    }
  };

  const startEdit = (category: Category) => {
    setEditing(category);
    setNewCategory({
      name: category.name,
      type: category.type as 'income' | 'expense' | 'both',
      icon: category.icon || 'Tag',
      color: category.color || '#7C3AED',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-display font-extrabold">Categorias</h1>
          <p className="mt-2 text-slate-500">Organize e personalize suas categorias conforme o plano.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-[#0F172A] px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
          <Tag className="w-4 h-4 text-brand-blue" /> {user?.plan} • {canManage ? 'Gerenciamento total ativado' : 'Gerenciamento bloqueado'}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="card border border-slate-200 dark:border-slate-700 bg-[#0F172A] p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Gerenciamento</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-100">Categorias personalizadas</h2>
            </div>
            <button
              onClick={fetchCategories}
              className="btn-outline inline-flex items-center gap-2 rounded-3xl px-4 py-3 text-sm"
            >
              <RefreshCcw className="w-4 h-4" /> Atualizar
            </button>
          </div>
          <p className="mt-4 text-sm text-slate-400">{defaultMessage}</p>

          <div className="mt-6 grid gap-3">
            <div className="rounded-3xl bg-slate-800 p-4 text-sm text-slate-300">
              {user?.plan !== 'PRO'
                ? 'Para criar, editar e excluir categorias você precisa atualizar para o Plano Pro.'
                : 'Use a área ao lado para adicionar ou editar categorias.'}
            </div>
            <div className="rounded-3xl bg-slate-800/60 p-4 text-sm text-slate-200">
              Categorias padrão:
              <div className="mt-2 flex flex-wrap gap-2">
                {DEFAULT_CATEGORIES.slice(0, 5).map((name) => (
                  <span key={name} className="chip bg-slate-700 text-slate-200">{name}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="card border border-slate-200 dark:border-slate-700 bg-[#0F172A] p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Nova categoria</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-100">Adicionar ou editar</h2>
            </div>
            {editing && <span className="rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue">Modo edição</span>}
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300">Nome</label>
              <input
                value={newCategory.name}
                onChange={(e) => setNewCategory((prev) => ({ ...prev, name: e.target.value }))}
                disabled={!canManage}
                className="input mt-1 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                placeholder="Ex: Streaming"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-300">Tipo</label>
                <select
                  value={newCategory.type}
                  onChange={(e) => setNewCategory((prev) => ({ ...prev, type: e.target.value as any }))}
                  disabled={!canManage}
                  className="input mt-1 bg-slate-800 border-slate-700 text-slate-100"
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                  <option value="both">Ambos</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300">Cor</label>
                <input
                  type="color"
                  value={newCategory.color}
                  disabled={!canManage}
                  onChange={(e) => setNewCategory((prev) => ({ ...prev, color: e.target.value }))}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-700 bg-slate-800 p-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300">Ícone</label>
              <input
                value={newCategory.icon}
                onChange={(e) => setNewCategory((prev) => ({ ...prev, icon: e.target.value }))}
                disabled={!canManage}
                className="input mt-1 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                placeholder="Ex: Wallet"
              />
              <p className="text-xs text-slate-500 mt-1">Nome do ícone Lucide (opcional)</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={saveCategory}
                disabled={!canManage || saving}
                className="btn-primary flex-1"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Salvar alterações' : 'Adicionar categoria'}
              </button>
              <button
                type="button"
                onClick={() => { resetForm(); setEditing(null); }}
                className="btn-outline flex-1"
              >
                Limpar
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="card border border-slate-200 dark:border-slate-700 bg-[#0F172A] p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Categorias cadastradas</h2>
            <p className="text-sm text-slate-400 mt-1">Visualize suas categorias e gerencie conforme seu plano.</p>
          </div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
            {categories.length} categorias
          </span>
        </div>

        {loading ? (
          <div className="mt-6 flex items-center justify-center gap-3 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /> Carregando categorias...</div>
        ) : error ? (
          <div className="mt-6 rounded-3xl border border-rose-800 bg-rose-950 p-4 text-rose-400">{error}</div>
        ) : categories.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-700 bg-slate-800/40 p-8 text-center text-slate-500">Nenhuma categoria encontrada.</div>
        ) : (
          <div className="mt-6 grid gap-4">
            {categories.map((category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-slate-700 bg-slate-800/50 p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 text-slate-100">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-3xl" style={{ backgroundColor: category.color || '#E0E7FF' }}>
                        <Tag className="w-5 h-5 text-white" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-100 truncate">{category.name}</p>
                        <p className="text-sm text-slate-400">{category.type === 'income' ? 'Receita' : category.type === 'expense' ? 'Despesa' : 'Ambos'}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span className="chip bg-slate-700 text-slate-300">ID: {category.id.slice(0, 8)}</span>
                      <span className="chip bg-slate-700 text-slate-300">Ativa: {category.isActive ? 'Sim' : 'Não'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => startEdit(category)}
                      className="btn-outline flex items-center gap-2 rounded-3xl px-4 py-2 text-sm"
                      disabled={!canManage}
                    >
                      <Edit2 className="w-4 h-4" /> Editar
                    </button>
                    <button
                      onClick={() => removeCategory(category)}
                      className="btn-ghost flex items-center gap-2 rounded-3xl px-4 py-2 text-sm text-rose-400 hover:bg-rose-950"
                      disabled={!canManage}
                    >
                      <Trash2 className="w-4 h-4" /> Excluir
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}