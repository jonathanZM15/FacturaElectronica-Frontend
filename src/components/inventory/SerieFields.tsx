import React from 'react';
import { StockInicialSerie } from '../../types/inventory';

interface Props {
    series: StockInicialSerie[];
    onChange: (series: StockInicialSerie[]) => void;
}

export const SerieFields: React.FC<Props> = ({ series, onChange }) => {
    const handleAdd = () => {
        onChange([...series, { numero_serie: '' }]);
    };

    const handleRemove = (index: number) => {
        onChange(series.filter((_, i) => i !== index));
    };

    const handleChange = (index: number, field: keyof StockInicialSerie, value: string | number) => {
        const newSeries = [...series];
        newSeries[index] = { ...newSeries[index], [field]: value };
        onChange(newSeries);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-700">Series de Inventario</h4>
                <span className="text-sm font-semibold bg-indigo-100 text-indigo-800 py-1 px-3 rounded-full">
                    Cantidad calculada: {series.length}
                </span>
            </div>
            {series.map((serie, index) => (
                <div key={index} className="flex gap-4 items-end bg-gray-50 p-4 rounded-md border border-gray-200 shadow-sm">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Número de Serie</label>
                        <input
                            type="text"
                            required
                            value={serie.numero_serie}
                            onChange={(e) => handleChange(index, 'numero_serie', e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all sm:text-sm bg-slate-50 focus:bg-white text-sm"
                        />
                    </div>
                    <div className="w-48">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Costo Unit. (Opcional)</label>
                        <input
                            type="number"
                            step="0.000001"
                            value={serie.costo_unitario || ''}
                            onChange={(e) => handleChange(index, 'costo_unitario', e.target.value ? Number(e.target.value) : undefined)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all sm:text-sm bg-slate-50 focus:bg-white text-sm"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        className="text-red-600 hover:text-red-800 p-2 rounded-md hover:bg-red-50 transition-colors"
                        title="Eliminar serie"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            ))}
            
            <button
                type="button"
                onClick={handleAdd}
                className="text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                Agregar Serie
            </button>
        </div>
    );
};
