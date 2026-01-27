import { Check } from 'lucide-react';
import { Fragment } from 'react';

export const ETAPAS = [
    'Recepción',
    'Ampliación',
    'Informe Síntesis',
    'Definición de Medidas',
    'Acta',
    'Seguimiento',
    'Cerrado'
];

interface StageStepperProps {
    currentStage: string;
}

const StageStepper = ({ currentStage }: StageStepperProps) => {
    const currentIndex = ETAPAS.indexOf(currentStage);

    return (
        <div className="bg-white p-6 rounded-lg border border-slate-200 mb-8">
            <div className="flex items-center justify-between">
                {ETAPAS.map((etapa, index) => {
                    const isCompleted = index < currentIndex;
                    const isActive = index === currentIndex;
                    const isLast = index === ETAPAS.length - 1;

                    return (
                        <Fragment key={etapa}>
                            <div className="flex flex-col items-center gap-2 relative group flex-1">
                                <div
                                    className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                    ${isCompleted ? 'bg-success border-success text-white' :
                                            isActive ? 'border-primary bg-white text-primary ring-4 ring-primary/10' :
                                                'border-slate-200 bg-white text-slate-400'}
                  `}
                                >
                                    {isCompleted ? <Check size={18} strokeWidth={3} /> : index + 1}
                                </div>
                                <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-slate-500'}`}>
                                    {etapa}
                                </span>

                                {/* Connector line */}
                                {!isLast && (
                                    <div className={`absolute top-5 left-[calc(50%+20px)] w-[calc(100%-40px)] h-0.5 ${isCompleted ? 'bg-success' : 'bg-slate-100'
                                        }`} />
                                )}
                            </div>
                        </Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default StageStepper;
