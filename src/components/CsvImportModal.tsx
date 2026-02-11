import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, X } from 'lucide-react';
import Modal from './Modal';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

type Step = 'upload' | 'mapping' | 'preview' | 'done';

const contactFields = [
  { key: 'name', label: 'Nome', required: true },
  { key: 'email', label: 'E-mail', required: false },
  { key: 'phone', label: 'Telefone', required: false },
  { key: 'company', label: 'Empresa', required: false },
  { key: 'role', label: 'Cargo', required: false },
  { key: 'status', label: 'Status (active/lead/inactive)', required: false },
  { key: 'value', label: 'Valor', required: false },
  { key: 'tags', label: 'Tags (separadas por ;)', required: false },
] as const;

type FieldKey = (typeof contactFields)[number]['key'];

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',' || ch === ';') {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function autoMapColumns(headers: string[]): Record<number, FieldKey | ''> {
  const mapping: Record<number, FieldKey | ''> = {};
  const patterns: Record<FieldKey, RegExp> = {
    name: /^(nome|name|full.?name|contato|contact)$/i,
    email: /^(e-?mail|email.?address|correo)$/i,
    phone: /^(telefone|phone|tel|celular|mobile|whatsapp|fone)$/i,
    company: /^(empresa|company|organiza|org)$/i,
    role: /^(cargo|role|posi|title|fun[cç])$/i,
    status: /^(status|situa|state)$/i,
    value: /^(valor|value|receita|revenue|amount)$/i,
    tags: /^(tags?|label|categor|segmento)$/i,
  };

  headers.forEach((h, i) => {
    const clean = h.trim();
    let matched: FieldKey | '' = '';
    for (const [field, regex] of Object.entries(patterns)) {
      if (regex.test(clean)) {
        matched = field as FieldKey;
        break;
      }
    }
    mapping[i] = matched;
  });

  return mapping;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CsvImportModal({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, FieldKey | ''>>({});
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { importContacts } = useData();
  const { user } = useAuth();

  const reset = () => {
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setRows([]);
    setMapping({});
    setImportedCount(0);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const processFile = useCallback((file: File) => {
    setError('');
    if (!file.name.endsWith('.csv')) {
      setError('Apenas arquivos .csv são aceitos.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Arquivo excede o limite de 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows: r } = parseCsv(text);
      if (h.length === 0 || r.length === 0) {
        setError('Arquivo CSV vazio ou sem dados válidos.');
        return;
      }
      if (r.length > 10000) {
        setError('Limite de 10.000 registros excedido.');
        return;
      }
      setFileName(file.name);
      setHeaders(h);
      setRows(r);
      setMapping(autoMapColumns(h));
      setStep('mapping');
    };
    reader.readAsText(file, 'utf-8');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const nameIsMapped = Object.values(mapping).includes('name');

  const getMappedData = () => {
    return rows.map((row) => {
      const entry: Record<string, string> = {};
      Object.entries(mapping).forEach(([colIdx, field]) => {
        if (field) {
          entry[field] = row[Number(colIdx)] || '';
        }
      });
      return entry;
    }).filter((entry) => entry.name?.trim());
  };

  const handleImport = () => {
    const mapped = getMappedData();
    const contactsToImport = mapped.map((row) => ({
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      company: row.company || '',
      role: row.role || '',
      status: (['active', 'inactive', 'lead'].includes(row.status?.toLowerCase()) ? row.status.toLowerCase() : 'lead') as 'active' | 'inactive' | 'lead',
      value: Number(row.value?.replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
      lastContact: new Date().toISOString().split('T')[0],
      tags: row.tags ? row.tags.split(/[;|]/).map((t) => t.trim()).filter(Boolean) : [],
      assignedTo: user?.id || 'u1',
    }));

    const count = importContacts(contactsToImport);
    setImportedCount(count);
    setStep('done');
  };

  const previewData = step === 'preview' ? getMappedData().slice(0, 10) : [];

  return (
    <Modal open={open} onClose={handleClose} title="Importar Contatos via CSV" width="max-w-3xl">
      {/* Step Indicator */}
      <div className="flex items-center gap-3 mb-6">
        {(['upload', 'mapping', 'preview', 'done'] as Step[]).map((s, i) => {
          const labels = ['Arquivo', 'Mapeamento', 'Preview', 'Concluído'];
          const isActive = s === step;
          const isPast = ['upload', 'mapping', 'preview', 'done'].indexOf(step) > i;
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="w-6 h-px" style={{ backgroundColor: isPast ? '#3b82f6' : 'var(--border-primary)' }} />}
              <div className="flex items-center gap-1.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: isActive ? '#3b82f6' : isPast ? '#22c55e' : 'var(--surface-tertiary)',
                    color: isActive || isPast ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: isActive ? '#3b82f6' : isPast ? '#22c55e' : 'var(--text-muted)' }}
                >
                  {labels[i]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <div>
          <div
            className="border-2 border-dashed rounded-xl p-10 text-center transition-colors"
            style={{
              borderColor: isDragging ? '#3b82f6' : 'var(--border-primary)',
              backgroundColor: isDragging ? 'rgba(59,130,246,0.05)' : 'transparent',
            }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div
              className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: isDragging ? 'rgba(59,130,246,0.1)' : 'var(--surface-tertiary)' }}
            >
              <Upload className="w-6 h-6" style={{ color: isDragging ? '#3b82f6' : '#94a3b8' }} />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Arraste seu arquivo CSV aqui ou clique para selecionar
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Suporta arquivos .csv com até 10.000 registros (max. 5MB)
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--tint-red)' }}>
              <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#dc2626' }} />
              <span className="text-sm font-medium" style={{ color: '#dc2626' }}>{error}</span>
            </div>
          )}

          <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--surface-tertiary)' }}>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Formato esperado do CSV:</p>
            <code className="text-xs text-slate-500 dark:text-slate-400 block leading-relaxed">
              nome,email,telefone,empresa,cargo,status,valor,tags<br />
              João Silva,joao@email.com,(11)99999-0001,Empresa A,Diretor,lead,50000,tech;enterprise<br />
              Maria Costa,maria@email.com,(11)99999-0002,Empresa B,Gerente,active,30000,mid-market
            </code>
          </div>
        </div>
      )}

      {/* Step: Mapping */}
      {step === 'mapping' && (
        <div>
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--tint-blue)' }}>
            <FileText className="w-4 h-4 shrink-0" style={{ color: '#2563eb' }} />
            <span className="text-sm" style={{ color: '#2563eb' }}>
              <strong>{fileName}</strong> — {rows.length} registro{rows.length !== 1 ? 's' : ''} encontrado{rows.length !== 1 ? 's' : ''}
            </span>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Associe cada coluna do CSV a um campo do contato:
          </p>

          <div className="space-y-2.5">
            {headers.map((header, colIdx) => (
              <div key={colIdx} className="flex items-center gap-3">
                <div className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 truncate">
                  {header}
                  <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">
                    ex: {rows[0]?.[colIdx] || '—'}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                <select
                  value={mapping[colIdx] || ''}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [colIdx]: e.target.value as FieldKey | '' }))}
                  className="w-48 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="">Ignorar</option>
                  {contactFields.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}{f.required ? ' *' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {!nameIsMapped && (
            <div className="flex items-center gap-2 mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--tint-amber)' }}>
              <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#d97706' }} />
              <span className="text-sm" style={{ color: '#d97706' }}>
                O campo <strong>Nome</strong> é obrigatório. Mapeie pelo menos uma coluna para "Nome".
              </span>
            </div>
          )}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => { reset(); }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <button
              onClick={() => setStep('preview')}
              disabled={!nameIsMapped}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-40"
              style={{ backgroundColor: '#3b82f6' }}
            >
              Próximo
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Pré-visualização dos primeiros {Math.min(10, getMappedData().length)} de <strong>{getMappedData().length}</strong> contatos:
          </p>

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900">
                  {contactFields.filter((f) => Object.values(mapping).includes(f.key)).map((f) => (
                    <th key={f.key} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {previewData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    {contactFields.filter((f) => Object.values(mapping).includes(f.key)).map((f) => (
                      <td key={f.key} className="px-3 py-2 text-slate-700 dark:text-slate-200 whitespace-nowrap max-w-[200px] truncate">
                        {row[f.key] || <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {getMappedData().length > 10 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
              ... e mais {getMappedData().length - 10} contatos
            </p>
          )}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setStep('mapping')}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <button
              onClick={handleImport}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:shadow-lg"
              style={{ backgroundColor: '#22c55e' }}
            >
              <Upload className="w-4 h-4" />
              Importar {getMappedData().length} contatos
            </button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <div className="text-center py-6">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: 'var(--tint-green)' }}
          >
            <CheckCircle2 className="w-8 h-8" style={{ color: '#16a34a' }} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
            Importação concluída!
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            <strong>{importedCount}</strong> contato{importedCount !== 1 ? 's' : ''} importado{importedCount !== 1 ? 's' : ''} com sucesso.
          </p>
          <button
            onClick={handleClose}
            className="px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-all"
            style={{ backgroundColor: '#3b82f6' }}
          >
            Fechar
          </button>
        </div>
      )}
    </Modal>
  );
}
