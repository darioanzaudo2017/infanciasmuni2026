import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';

interface EmailNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    ingreso: any;
}

const EmailNotificationModal: React.FC<EmailNotificationModalProps> = ({ isOpen, onClose, ingreso }) => {
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState(`Notificación de Cese de Intervención - Legajo ${ingreso.expediente_numero}`);
    const [body, setBody] = useState(`Hola,\n\nSe informa el cese de intervención para el NNA ${ingreso.nino_nombre} ${ingreso.nino_apellido} (DNI ${ingreso.nino_dni}).\n\nMotivo: ${ingreso.cese?.motivo_cese || 'N/A'}\n\nResumen de logros: ${ingreso.cese?.resumen_logros || 'Sin contenido.'}\n\nSaludos.`);
    const [attachments, setAttachments] = useState<{ file: File; base64: string }[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

    if (!isOpen) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newAttachments: { file: File; base64: string }[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();
            
            const base64 = await new Promise<string>((resolve) => {
                reader.onload = () => {
                    const result = reader.result as string;
                    const base64String = result.split(',')[1];
                    resolve(base64String);
                };
                reader.readAsDataURL(file);
            });

            newAttachments.push({ file, base64 });
        }

        setAttachments(prev => [...prev, ...newAttachments]);
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        setIsSending(true);
        setStatus({ type: null, message: '' });

        try {
            const { error } = await supabase.functions.invoke('send-email', {
                body: {
                    to: to.split(',').map(email => email.trim()),
                    subject,
                    html: body.replace(/\n/g, '<br>'),
                    attachments: attachments.map(att => ({
                        filename: att.file.name,
                        content: att.base64
                    }))
                }
            });

            if (error) throw error;

            setStatus({ type: 'success', message: 'Email enviado correctamente' });
            setTimeout(() => {
                onClose();
                setStatus({ type: null, message: '' });
                setAttachments([]);
                setTo('');
            }, 2000);
        } catch (error: any) {
            console.error('Error sending email:', error);
            setStatus({ type: 'error', message: `Error al enviar: ${error.message || 'Error desconocido'}` });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#081111]/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white dark:bg-[#0f172a] w-full max-w-2xl rounded-[32px] shadow-2xl flex flex-col overflow-hidden relative z-10 border border-white/10 animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-primary/5">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined">mail</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Enviar Notificación</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Vía Resend API</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="size-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    {status.type && (
                        <div className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-2 ${
                            status.type === 'success' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}>
                            <span className="material-symbols-outlined text-base">
                                {status.type === 'success' ? 'check_circle' : 'error'}
                            </span>
                            {status.message}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Destinatario(s) <span className="text-slate-300 normal-case font-medium">(separados por coma)</span></label>
                        <input
                            type="text"
                            className="w-full h-12 px-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/30 transition-all"
                            placeholder="ejemplo@correo.com, otro@correo.com"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Asunto</label>
                        <input
                            type="text"
                            className="w-full h-12 px-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/30 transition-all"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Cuerpo del Mensaje</label>
                        <textarea
                            className="w-full min-h-[150px] p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/30 transition-all resize-none"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between ml-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Archivos Adjuntos</label>
                            <label className="cursor-pointer text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
                                + Agregar archivo
                                <input type="file" multiple className="hidden" onChange={handleFileChange} />
                            </label>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            {attachments.map((att, index) => (
                                <div key={index} className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl group transition-all">
                                    <span className="material-symbols-outlined text-sm text-slate-400">description</span>
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 max-w-[150px] truncate">{att.file.name}</span>
                                    <button 
                                        onClick={() => removeAttachment(index)}
                                        className="size-5 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/30 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                    </button>
                                </div>
                            ))}
                            {attachments.length === 0 && (
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic ml-2">No hay archivos seleccionados</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSending}
                        className="px-6 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-500"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={isSending || !to}
                        className="px-10 h-12 bg-primary text-[#112121] text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                    >
                        {isSending ? (
                            <>
                                <div className="animate-spin size-4 border-2 border-[#112121] border-t-transparent rounded-full"></div>
                                Enviando...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-base">send</span>
                                Enviar Ahora
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailNotificationModal;
