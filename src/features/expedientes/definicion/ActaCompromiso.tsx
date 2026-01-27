
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';

const ActaCompromiso = () => {
    const { expedienteId, ingresoId } = useParams<{ expedienteId: string; ingresoId: string }>();
    const navigate = useNavigate();
    const [ingreso, setIngreso] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [childData, setChildData] = useState<any>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [vulneraciones, setVulneraciones] = useState<any[]>([]);
    const [medidas, setMedidas] = useState<any[]>([]);

    const [familyCompromise, setFamilyCompromise] = useState('Garantizar la asistencia regular al centro educativo y acompañar el tratamiento psicológico.');
    const [institutionCompromise, setInstitutionCompromise] = useState('Proveer vacante en taller de oficios, gestionar subsidio de transporte y realizar seguimiento quincenal.');
    const [otherCompromise, setOtherCompromise] = useState('La escuela se compromete a informar inasistencias de manera inmediata.');

    const toggleParticipant = (id: string) => {
        setParticipants(prev => prev.map(p =>
            p.id === id ? { ...p, selected: !p.selected } : p
        ));
    };

    const [showAddModal, setShowAddModal] = useState(false);
    const [newParticipant, setNewParticipant] = useState({ name: '', role: '', dni: '' });

    const handleAddParticipant = () => {
        if (!newParticipant.name || !newParticipant.role) return;
        const newP = {
            id: `manual-${Date.now()}`,
            name: newParticipant.name,
            role: newParticipant.role,
            dni: newParticipant.dni,
            type: 'manual',
            selected: true,
            initials: newParticipant.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        };
        setParticipants(prev => [...prev, newP]);
        setNewParticipant({ name: '', role: '', dni: '' });
        setShowAddModal(false);
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!ingresoId) return;
            setLoading(true);
            try {
                // Fetch Ingreso Details
                const { data: ingData } = await supabase
                    .from('vw_ingresos_detalle')
                    .select('*')
                    .eq('id', ingresoId)
                    .single();
                setIngreso(ingData);

                // Fetch extra child data
                const { data: extraData } = await supabase
                    .from('form1_datos_nino')
                    .select('*')
                    .eq('ingreso_id', ingresoId)
                    .maybeSingle();

                setChildData({
                    ...(ingData || {}),
                    nino_domicilio: extraData?.domicilio || ingData?.nino_domicilio,
                    nino_localidad: extraData?.localidad || ingData?.nino_localidad
                });

                // Fetch Participants (Family & Referents)
                const [familyRes, referentsRes, vulRes, medRes] = await Promise.all([
                    supabase.from('grupo_conviviente').select('*').eq('ingreso_id', ingresoId),
                    supabase.from('referentes_comunitarios').select('*').eq('ingreso_id', ingresoId),
                    supabase.from('derechos_vulnerados').select('*, catalogo_derechos(categoria, subcategoria)').eq('ingreso_id', ingresoId),
                    supabase.from('medidas').select('*').eq('ingreso_id', ingresoId)
                ]);

                if (vulRes.data) setVulneraciones(vulRes.data);
                if (medRes.data) setMedidas(medRes.data);

                const mappedParticipants = [
                    ...(familyRes.data || []).map((f: any) => ({
                        id: `fam-${f.id}`,
                        name: `${f.nombre} ${f.apellido}`,
                        role: f.vinculo,
                        dni: f.dni,
                        type: 'family',
                        selected: true,
                        initials: `${f.nombre?.[0] || ''}${f.apellido?.[0] || ''}`.toUpperCase()
                    })),
                    ...(referentsRes.data || []).map((r: any) => ({
                        id: `ref-${r.id}`,
                        name: `${r.nombre} ${r.apellido}`,
                        role: r.vinculo || 'Referente',
                        dni: r.dni,
                        type: 'referent',
                        selected: false,
                        initials: `${r.nombre?.[0] || ''}${r.apellido?.[0] || ''}`.toUpperCase()
                    }))
                ];

                // Add Professional if available
                // Add Professional if available
                if (ingData?.profesional_asignado_nombre) {
                    mappedParticipants.push({
                        id: 'prof-assigned',
                        name: ingData.profesional_asignado_nombre,
                        role: 'Profesional a Cargo',
                        type: 'professional',
                        selected: true,
                        dni: '',
                        initials: ingData.profesional_asignado_nombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                    });
                } else {
                    // Fallback or current user
                    mappedParticipants.push({
                        id: 'prof-curr',
                        name: 'Lic. Profesional',
                        role: 'Trabajador Social',
                        type: 'professional',
                        selected: true,
                        dni: '',
                        initials: 'LP'
                    });
                }

                setParticipants(mappedParticipants);

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [ingresoId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="flex h-screen items-center justify-center">Cargando acta...</div>;
    if (!ingreso) return <div className="flex h-screen items-center justify-center">No se encontró el ingreso</div>;

    return (
        <div className="bg-[#f7f6f8] dark:bg-[#17131f] text-[#131217] dark:text-[#f2f1f4] min-h-screen flex flex-col font-['Public_Sans',sans-serif]">
            {/* Top Navigation Bar */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#e5e4e9] dark:border-[#2d2838] bg-white dark:bg-[#1f1a29] px-6 py-3 sticky top-0 z-50 print:hidden">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 text-primary" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                        <div className="size-6 text-[#411f89]">
                            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                <path d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z" fill="currentColor"></path>
                            </svg>
                        </div>
                        <h2 className="text-[#131217] dark:text-white text-lg font-bold leading-tight tracking-tight">Sistema NNyA</h2>
                    </div>
                    <div className="h-6 w-px bg-[#e5e4e9] dark:bg-[#2d2838]"></div>
                    <nav className="flex items-center gap-6">
                        <a className="text-[#131217] dark:text-[#f2f1f4] text-sm font-medium hover:text-primary transition-colors cursor-pointer" onClick={() => navigate('/')}>Dashboard</a>
                        <a className="text-[#131217] dark:text-[#f2f1f4] text-sm font-medium border-b-2 border-primary pb-1 cursor-pointer">Expedientes</a>
                        <a className="text-[#131217] dark:text-[#f2f1f4] text-sm font-medium hover:text-primary transition-colors cursor-pointer">Reportes</a>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                        <button className="p-2 rounded hover:bg-[#f2f1f4] dark:hover:bg-[#2d2838] text-[#706685]">
                            <span className="material-symbols-outlined">notifications</span>
                        </button>
                        <button className="p-2 rounded hover:bg-[#f2f1f4] dark:hover:bg-[#2d2838] text-[#706685]">
                            <span className="material-symbols-outlined">settings</span>
                        </button>
                    </div>
                    <div className="size-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                        DA
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar: Context & Navigation */}
                <aside className="w-64 border-r border-[#e5e4e9] dark:border-[#2d2838] bg-white dark:bg-[#1f1a29] flex flex-col shrink-0 print:hidden">
                    <div className="p-4 flex flex-col gap-6">
                        <div className="flex gap-3 items-center">
                            <div className="bg-[#411f89]/10 text-[#411f89] p-2 rounded-lg">
                                <span className="material-symbols-outlined">shield_person</span>
                            </div>
                            <div className="flex flex-col">
                                <p className="text-[#706685] text-xs font-semibold uppercase tracking-wider">Etapa 5</p>
                                <h1 className="text-[#131217] dark:text-white text-sm font-bold">Formalización</h1>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div onClick={() => navigate(`/expedientes/${expedienteId}/ingresos/${ingresoId}`)} className="flex items-center gap-3 px-3 py-2 text-[#706685] hover:bg-[#f2f1f4] dark:hover:bg-[#2d2838] rounded transition-colors cursor-pointer">
                                <span className="material-symbols-outlined">home</span>
                                <p className="text-sm font-medium">Volver al Caso</p>
                            </div>
                            <div className="flex items-center gap-3 px-3 py-2 text-[#411f89] bg-[#411f89]/5 rounded border-l-4 border-[#411f89]">
                                <span className="material-symbols-outlined">description</span>
                                <p className="text-sm font-bold">Acta Actual</p>
                            </div>
                            <div className="flex items-center gap-3 px-3 py-2 text-[#706685] hover:bg-[#f2f1f4] dark:hover:bg-[#2d2838] rounded transition-colors cursor-pointer">
                                <span className="material-symbols-outlined">folder_open</span>
                                <p className="text-sm font-medium">Historial Medidas</p>
                            </div>
                            <div className="flex items-center gap-3 px-3 py-2 text-[#706685] hover:bg-[#f2f1f4] dark:hover:bg-[#2d2838] rounded transition-colors cursor-pointer">
                                <span className="material-symbols-outlined">assignment_turned_in</span>
                                <p className="text-sm font-medium">Verificación</p>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-[#e5e4e9] dark:border-[#2d2838]">
                            <p className="px-3 text-[10px] font-bold text-[#706685] uppercase tracking-widest mb-2">Estado del Proceso</p>
                            <div className="px-3">
                                <div className="w-full bg-[#f2f1f4] dark:bg-[#2d2838] h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-[#411f89] w-[80%] h-full"></div>
                                </div>
                                <p className="text-[11px] mt-2 text-[#706685]">80% completado (Formalización)</p>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content: Document Workspace */}
                <main className="flex-1 overflow-y-auto bg-[#f0f1f5] dark:bg-[#121017] p-8">
                    <div className="max-w-5xl mx-auto flex flex-col gap-6">
                        {/* Breadcrumbs & Heading */}
                        <div className="flex flex-col gap-2 print:hidden">
                            <Breadcrumbs
                                items={[
                                    { label: 'Inicio', path: '/' },
                                    { label: 'Expedientes', path: '/expedientes' },
                                    { label: 'Historial de Ingresos', path: `/expedientes/${expedienteId}/ingresos` },
                                    { label: 'Detalle de Legajo', path: `/expedientes/${expedienteId}/ingresos/${ingresoId}` },
                                    { label: 'Generación de Acta', active: true }
                                ]}
                            />
                            <div className="flex justify-between items-end">
                                <div>
                                    <h2 className="text-3xl font-black text-[#131217] dark:text-white tracking-tight">Acta de Compromiso</h2>
                                    <p className="text-[#706685] text-base">Formalización y firma de acuerdos institucionales y familiares.</p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1f1a29] border border-[#e5e4e9] dark:border-[#2d2838] rounded font-bold text-sm hover:shadow-md transition-all">
                                        <span className="material-symbols-outlined">visibility</span>
                                        Vista Previa / Imprimir
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Document Layout */}
                        <div className="flex flex-col lg:flex-row gap-8 items-start">
                            {/* Paper Component */}
                            <div className="flex-1 w-full">
                                <div className="bg-white dark:bg-[#1f1a29] p-16 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] min-h-[1122px] w-full max-w-[800px] mx-auto relative print:shadow-none print:w-full print:max-w-none">
                                    {/* Paper Header */}
                                    <div className="border-b-2 border-double border-[#131217] dark:border-white pb-8 mb-8">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col gap-1">
                                                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#706685]">Municipalidad de Córdoba</p>
                                                <h3 className="text-xl font-bold uppercase">Secretaría de Familia e Infancias</h3>
                                                <p className="text-xs text-[#706685]">Dirección General de Niñez y Adolescencia</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="bg-[#411f89] text-white px-3 py-1 text-sm font-bold mb-1 print:bg-black/80">EXP #{ingreso.expediente_numero}</div>
                                                <p className="text-xs text-[#706685]">Fecha: {format(new Date(), "dd 'de' MMMM, yyyy", { locale: es })}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Document Body - Updated Template */}
                                    <div className="space-y-6 text-[#131217] dark:text-white leading-relaxed text-justify">

                                        <h4 className="text-center font-bold text-lg underline decoration-1 underline-offset-4 uppercase mb-8">ACTA ACUERDO</h4>

                                        <p>
                                            <strong>ACTA ACUERDO</strong> entre el Niño/Niña/Adolescente <strong>{childData?.nino_nombre} {childData?.nino_apellido}</strong>, DNI: <strong>{childData?.nino_dni}</strong>, su familia y el Servicio Municipal de Protección integral de Derechos de Niños Niñas y Adolescentes.
                                        </p>

                                        <p>
                                            En la ciudad de Córdoba a los <strong>{format(new Date(), "dd", { locale: es })}</strong> días del mes de <strong>{format(new Date(), "MMMM", { locale: es })}</strong> del año dos mil <strong>{format(new Date(), "yyyy", { locale: es })}</strong> se hacen presentes el niño/niña/adolescente <strong>{childData?.nino_nombre} {childData?.nino_apellido}</strong>, DNI: <strong>{childData?.nino_dni}</strong>, los integrantes de su familia y referentes:
                                            {participants.filter(p => p.selected && p.type !== 'professional').length > 0 ? (
                                                <span className="font-semibold"> {participants.filter(p => p.selected && p.type !== 'professional').map(p => `${p.name} (DNI ${p.dni || '__________'})`).join(', ')}</span>
                                            ) : (
                                                <span className="italic text-gray-500"> [Sin otros participantes presentes]</span>
                                            )},
                                            respectivamente, con domicilio en <strong>{childData?.nino_domicilio || '__________'}</strong> de la ciudad de Córdoba y el Servicio Municipal de Protección de Derechos con sede en el SPD <strong>Zona Norte</strong> de esta ciudad, representado en este acto por <strong>{participants.find(p => p.selected && p.type === 'professional')?.name || 'el profesional a cargo'}</strong>.
                                        </p>

                                        <p>
                                            En el marco del procedimiento de intervención realizado por el Servicio Municipal a partir de la fecha <strong>{ingreso?.fecha_ingreso ? format(new Date(ingreso.fecha_ingreso), "dd/MM/yyyy") : '__________'}</strong> según Expediente <strong>{ingreso?.expediente_numero}</strong> el niño/a, en relación a los derechos:
                                        </p>

                                        {/* Derechos List */}
                                        <div className="pl-4 border-l-2 border-[#411f89] my-2 bg-gray-50 dark:bg-white/5 p-2">
                                            {vulneraciones.length > 0 ? (
                                                <ul className="list-disc list-inside">
                                                    {vulneraciones.map((v: any) => (
                                                        <li key={v.id}>
                                                            {v.catalogo_derechos?.categoria} - {v.catalogo_derechos?.subcategoria}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <span className="italic text-gray-500">Sin derechos vulnerados registrados.</span>
                                            )}
                                        </div>

                                        <p>
                                            El niño/a y su familia <strong>ACUERDAN</strong> la implementación por parte del Servicio de las siguientes <strong>MEDIDAS DE PROTECCIÓN INTEGRAL</strong> de conformidad a lo establecido por ley provincial 9944.
                                        </p>

                                        {/* Medidas List */}
                                        <div className="pl-4 border-l-2 border-[#411f89] my-2 bg-gray-50 dark:bg-white/5 p-2">
                                            {medidas.length > 0 ? (
                                                <ul className="list-disc list-inside">
                                                    {medidas.map((m: any) => (
                                                        <li key={m.id}>
                                                            <strong>{m.medida_propuesta}:</strong> {m.descripcion}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <span className="italic text-gray-500">Sin medidas registradas.</span>
                                            )}
                                        </div>

                                        <p>
                                            En relación a estas MEDIDAS los presentes asumen las siguiente responsabilidades:
                                        </p>

                                        <div className="space-y-4">
                                            <div>
                                                <p className="font-bold underline mb-1">El Servicio:</p>
                                                <div
                                                    className="print:hidden p-3 border border-dashed border-[#d1d0d5] dark:border-[#3d3848] rounded bg-white dark:bg-[#2d2838] text-sm outline-none"
                                                    contentEditable={true}
                                                    onInput={(e) => setInstitutionCompromise(e.currentTarget.textContent || '')}
                                                    suppressContentEditableWarning={true}
                                                >
                                                    {institutionCompromise}
                                                </div>
                                                <p className="hidden print:block text-justify border-b border-black/20 pb-1">{institutionCompromise}</p>
                                            </div>

                                            <div>
                                                <p className="font-bold underline mb-1">La Familia:</p>
                                                <div
                                                    className="print:hidden p-3 border border-dashed border-[#d1d0d5] dark:border-[#3d3848] rounded bg-white dark:bg-[#2d2838] text-sm outline-none"
                                                    contentEditable={true}
                                                    onInput={(e) => setFamilyCompromise(e.currentTarget.textContent || '')}
                                                    suppressContentEditableWarning={true}
                                                >
                                                    {familyCompromise}
                                                </div>
                                                <p className="hidden print:block text-justify border-b border-black/20 pb-1">{familyCompromise}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <p>Se deja constancia que por su parte la institución/organismo:</p>
                                            <div
                                                className="print:hidden p-3 border border-dashed border-[#d1d0d5] dark:border-[#3d3848] rounded bg-white dark:bg-[#2d2838] text-sm outline-none mt-1"
                                                contentEditable={true}
                                                onInput={(e) => setOtherCompromise(e.currentTarget.textContent || '')}
                                                suppressContentEditableWarning={true}
                                            >
                                                {otherCompromise}
                                            </div>
                                            <p className="hidden print:block text-justify mt-1">
                                                <span className="italic">{otherCompromise}</span>
                                            </p>
                                        </div>

                                        {/* Signatures */}
                                        <div className="grid grid-cols-2 gap-x-12 pt-16 gap-y-12">
                                            {participants.filter(p => p.selected).map(p => (
                                                <div key={p.id} className="text-center">
                                                    <div className="border-t border-black w-3/4 mx-auto pt-2">
                                                        <p className="font-black uppercase text-xs mb-1">{p.name}</p>
                                                        <p className="text-[10px] text-gray-600 uppercase">{p.role} - DNI: {p.dni || '__________'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Sidebar: Participants & Actions */}
                            <div className="w-80 flex flex-col gap-6 sticky top-24 print:hidden">
                                {/* Participants Card */}
                                <div className="bg-white dark:bg-[#1f1a29] border border-[#e5e4e9] dark:border-[#2d2838] rounded-xl overflow-hidden">
                                    <div className="bg-[#f2f1f4] dark:bg-[#2d2838] px-4 py-3 flex justify-between items-center">
                                        <h4 className="text-sm font-bold">Participantes</h4>
                                        <button onClick={() => setShowAddModal(true)} className="text-[#411f89] hover:text-[#411f89]/80">
                                            <span className="material-symbols-outlined">person_add</span>
                                        </button>
                                    </div>
                                    <div className="p-4 flex flex-col gap-3">
                                        {/* Participant Item */}
                                        {participants.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No se encontraron participantes asociados</p>}
                                        {participants.map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => toggleParticipant(p.id)}
                                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${p.selected ? 'bg-[#411f89]/5 border-[#411f89]/20' : 'hover:bg-[#f2f1f4] dark:hover:bg-[#2d2838] border-transparent'}`}
                                            >
                                                <div className={`size-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${p.selected ? 'bg-[#411f89]' : 'bg-gray-400'}`}>
                                                    {p.initials}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-bold truncate ${p.selected ? 'text-[#411f89] dark:text-[#a78bfa]' : 'text-gray-600 dark:text-gray-400'}`}>{p.name}</p>
                                                    <p className="text-[11px] text-[#706685]">{p.dni ? `DNI ${p.dni} • ` : ''}{p.role}</p>
                                                </div>
                                                <span className={`material-symbols-outlined text-sm ${p.selected ? 'text-[#411f89]' : 'text-[#d1d0d5]'}`}>
                                                    {p.selected ? 'check_circle' : 'circle'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Main Actions Container */}
                                <div className="flex flex-col gap-3">
                                    <button onClick={handlePrint} className="w-full flex items-center justify-center gap-2 bg-[#411f89] text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all active:scale-[0.98]">
                                        <span className="material-symbols-outlined">picture_as_pdf</span>
                                        Generar PDF para Firma
                                    </button>
                                    <button className="w-full flex items-center justify-center gap-2 bg-white dark:bg-[#1f1a29] border-2 border-[#411f89] text-[#411f89] py-3 rounded-xl font-bold hover:bg-[#411f89]/5 transition-all">
                                        <span className="material-symbols-outlined">upload_file</span>
                                        Subir Acta Firmada
                                    </button>
                                    <div className="h-px bg-[#e5e4e9] dark:bg-[#2d2838] my-1"></div>
                                    <button className="w-full flex items-center justify-center gap-2 bg-[#22c55e] text-white py-3 rounded-xl font-bold hover:bg-[#16a34a] transition-all opacity-50 cursor-not-allowed">
                                        <span className="material-symbols-outlined">task_alt</span>
                                        Finalizar Proceso
                                    </button>
                                    <p className="text-[10px] text-center text-[#706685]">El botón "Finalizar" se activará una vez subido el documento firmado por todas las partes.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Sticky Bottom Status Bar */}
            {/* Sticky Bottom Status Bar */}
            <footer className="h-10 bg-[#131217] text-white flex items-center px-6 justify-between text-xs font-medium print:hidden">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2"><div className="size-2 rounded-full bg-green-500 animate-pulse"></div> Sistema Conectado</span>
                    <span className="text-[#706685]">|</span>
                    <span>Operador: Dr. Sergio Mendez</span>
                </div>
                <div className="flex items-center gap-6">
                    <span>Último guardado: Hace 2 minutos</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">lock</span> Conexión Segura SSL</span>
                </div>
            </footer>

            {/* Add Participant Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-[#1f1a29] w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                            <h3 className="font-bold text-lg mb-4 text-[#131217] dark:text-white">Agregar Participante</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-[#706685] mb-1">Nombre Completo</label>
                                    <input
                                        className="w-full bg-[#f2f1f4] dark:bg-[#2d2838] border-none rounded-lg px-3 py-2 text-sm text-[#131217] dark:text-white"
                                        value={newParticipant.name}
                                        onChange={e => setNewParticipant({ ...newParticipant, name: e.target.value })}
                                        placeholder="Ej: Juan Perez"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-[#706685] mb-1">Rol / Vínculo</label>
                                    <input
                                        className="w-full bg-[#f2f1f4] dark:bg-[#2d2838] border-none rounded-lg px-3 py-2 text-sm text-[#131217] dark:text-white"
                                        value={newParticipant.role}
                                        onChange={e => setNewParticipant({ ...newParticipant, role: e.target.value })}
                                        placeholder="Ej: Tío Materno"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-[#706685] mb-1">DNI (Opcional)</label>
                                    <input
                                        className="w-full bg-[#f2f1f4] dark:bg-[#2d2838] border-none rounded-lg px-3 py-2 text-sm text-[#131217] dark:text-white"
                                        value={newParticipant.dni}
                                        onChange={e => setNewParticipant({ ...newParticipant, dni: e.target.value })}
                                        placeholder="Solo números"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-bold text-[#706685] hover:bg-[#f2f1f4] rounded-lg">Cancelar</button>
                                <button onClick={handleAddParticipant} className="px-4 py-2 text-sm font-bold bg-[#411f89] text-white rounded-lg hover:bg-[#411f89]/90">Agregar</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ActaCompromiso;
