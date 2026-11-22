import { useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, AlertCircle, X } from 'lucide-react';

export interface ConflictDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onReloadLatest: () => void;
    onOverwrite: () => void;
    localData: Record<string, any>;
    currentData: Record<string, any>;
    title?: string;
    description?: string;
}

function formatValue(val: any): string {
    if (val === undefined || val === null) return '—';
    if (typeof val === 'string') {
        if (!val.trim()) return '—';
        if (val.length > 120) return `${val.slice(0, 117)}...`;
        return val;
    }
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') return String(val);
    if (Array.isArray(val)) {
        if (val.length === 0) return '[]';
        return `Array (${val.length} items)`;
    }
    if (typeof val === 'object') {
        return `{ ${Object.keys(val).join(', ')} }`;
    }
    return String(val);
}

export default function ConflictDialog({
    isOpen,
    onClose,
    onReloadLatest,
    onOverwrite,
    localData = {},
    currentData = {},
    title = 'Version Conflict Detected',
    description = 'Another administrator or process modified this record while you were editing it. Review the differences below to decide whether to reload the latest server changes or overwrite them with your version.',
}: ConflictDialogProps) {
    const [confirmingOverwrite, setConfirmingOverwrite] = useState(false);

    // Compute top-level field differences
    const differences = useMemo(() => {
        const allKeys = Array.from(new Set([...Object.keys(localData), ...Object.keys(currentData)]));
        const diffs: Array<{ key: string; localVal: any; currentVal: any }> = [];

        for (const k of allKeys) {
            // Ignore internal revision or version metadata fields from diff table
            if (k === 'version' || k === 'updatedAt' || k === 'createdAt' || k === 'id') continue;

            const localVal = localData[k];
            const currentVal = currentData[k];

            const localStr = JSON.stringify(localVal ?? null);
            const currentStr = JSON.stringify(currentVal ?? null);

            if (localStr !== currentStr) {
                diffs.push({ key: k, localVal, currentVal });
            }
        }

        return diffs;
    }, [localData, currentData]);

    if (!isOpen) return null;

    const handleOverwriteClick = () => {
        if (!confirmingOverwrite) {
            setConfirmingOverwrite(true);
            return;
        }
        setConfirmingOverwrite(false);
        onOverwrite();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-amber-200 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 bg-amber-50/80 border-b border-amber-200/80 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-600">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-1.5 rounded-full hover:bg-amber-100 text-slate-400 hover:text-slate-700 transition"
                                title="Close dialog"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {description}
                        </p>
                    </div>
                </div>

                {/* Diff Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Conflicting Fields ({differences.length})
                        </span>
                        <span className="text-xs text-amber-700 bg-amber-100 font-semibold px-2.5 py-0.5 rounded-full">
                            HTTP 409 Conflict
                        </span>
                    </div>

                    {differences.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-xs">
                            No top-level field differences detected (conflict may be due to version tag increment).
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                                        <th className="py-2.5 px-3 text-left w-1/4">Field</th>
                                        <th className="py-2.5 px-3 text-left w-3/8 text-blue-700 bg-blue-50/50">Your Edits (Unsaved)</th>
                                        <th className="py-2.5 px-3 text-left w-3/8 text-amber-800 bg-amber-50/50">Server Current</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {differences.map(({ key, localVal, currentVal }) => (
                                        <tr key={key} className="hover:bg-slate-50/50">
                                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800 bg-slate-50/30">
                                                {key}
                                            </td>
                                            <td className="py-2.5 px-3 font-mono text-blue-900 bg-blue-50/20 break-words">
                                                {formatValue(localVal)}
                                            </td>
                                            <td className="py-2.5 px-3 font-mono text-amber-900 bg-amber-50/20 break-words">
                                                {formatValue(currentVal)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {confirmingOverwrite && (
                        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-900 text-xs">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                            <div>
                                <span className="font-bold">Are you sure you want to overwrite?</span> This will replace the changes made on the server with your local version.
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                    >
                        Keep Editing
                    </button>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => {
                                setConfirmingOverwrite(false);
                                onReloadLatest();
                            }}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Reload Latest (Discard Mine)
                        </button>

                        <button
                            type="button"
                            onClick={handleOverwriteClick}
                            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                confirmingOverwrite
                                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                                    : 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                            }`}
                        >
                            {confirmingOverwrite ? 'Yes, Confirm Overwrite' : 'Overwrite With Mine'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
