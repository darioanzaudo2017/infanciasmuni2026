import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { format } from 'date-fns';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';

const INITIAL_FORM_DATA = {
    nino_id: '',
    nombre: '',
    apellido: '',
    dni: '',
    fecha_nacimiento: '',
    genero: '',
    expediente_id: '',
    spd_id: '',
    zona_id: '',
    domicilio: '',
    localidad: '',
    barrio: '',
    centro_salud: '',
    historia_clinica: '',
    tiene_cud: false,
    cobertura_medica: 'Publica',
    observaciones_salud: '',
    nivel_educativo: '',
    curso: '',
    turno: 'Mañana',
    institucion_educativa: '',
    asiste_regularmente: true,
    trabaja: false,
    trabajo_detalle: '',
    grupo_familiar: [] as any[],
    referentes: [] as any[],
    motivo_principal: '',
    gravedad: 'Moderada',
    relato_situacion: '',
    derechos_seleccionados: [] as number[],
    vulneraciones: [{ derecho_id: '', indicador: '', observaciones: '' }] as any[],
    decision_id: 'asesoramiento' as 'asesoramiento' | 'derivacion' | 'abordaje_integral',
    observaciones_cierre: '',
    derivacion: {
        via_ingreso: '',
        institucion_id: '',
        oficio_numero: '',
        nombre_solicitante: '',
        dni_solicitante: '',
        cargo_solicitante: ''
    },
    archivos: [] as any[]
};

const FormularioRecepcion: React.FC = () => {
    const { ingresoId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [ninoData, setNinoData] = useState<any>(null);
    const [spds, setSpds] = useState<any[]>([]);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [loadingNino, setLoadingNino] = useState(false);
    const [catalogoDerechos, setCatalogoDerechos] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);
    // ... rest of states ...
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isReferenteDrawerOpen, setIsReferenteDrawerOpen] = useState(false);
    const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(null);
    const [editingReferenteIndex, setEditingReferenteIndex] = useState<number | null>(null);
    const [currentMember, setCurrentMember] = useState({
        dni: '',
        nombre: '',
        apellido: '',
        fecha_nacimiento: '',
        vinculo: '',
        telefono: '',
        convive: true,
        direccion: '',
        observaciones: ''
    });

    const [currentReferente, setCurrentReferente] = useState({
        nombre: '',
        apellido: '',
        dni: '',
        vinculo: '',
        telefono: '',
        direccion: '',
        puede_acompanar: false,
        puede_aportar_info: true,
        es_referente_principal: false,
        observaciones: ''
    });

    // Data State
    const [formData, setFormData] = useState({
        ...INITIAL_FORM_DATA,
        nino_id: searchParams.get('nino_id') || '',
        dni: searchParams.get('dni') || '',
        expediente_id: searchParams.get('expediente_id') || ''
    });

    // Reset form when navigating to a new case
    useEffect(() => {
        console.log('FormularioRecepcion mounted/updated - ingresoId:', ingresoId);
        if (!ingresoId) {
            console.log('Resetting form for new case');
            setFormData({
                ...INITIAL_FORM_DATA,
                nino_id: searchParams.get('nino_id') || '',
                dni: searchParams.get('dni') || '',
                expediente_id: searchParams.get('expediente_id') || ''
            });
            setCurrentStep(1);
            setNinoData(null);
        }
    }, [ingresoId, searchParams.toString()]); // Use toString() to detect param changes

    // Load existing ingreso data or fetch nino data for new cases
    useEffect(() => {
        const fetchExistingData = async () => {
            if (!ingresoId) return;
            setIsLoadingData(true);
            try {
                const { data: ingreso, error: ingErr } = await supabase.from('ingresos').select('*, expedientes(*)').eq('id', ingresoId).single();
                if (ingErr) throw ingErr;
                if (!ingreso) throw new Error('Ingreso not found');

                const exp = ingreso.expedientes as any;
                const { data: nino, error: ninoErr } = await supabase.from('ninos').select('*').eq('id', exp.nino_id).single();
                if (ninoErr) throw ninoErr;
                if (!nino) throw new Error('Niño not found');

                const [
                    { data: form1DatosNino },
                    { data: derivacion },
                    { data: motivo },
                    { data: vulnerabilidadesData },
                    { data: grupoFamiliarData },
                    { data: referentesData },
                    { data: decisionData },
                    { data: documentosData }
                ] = await Promise.all([
                    supabase.from('form1_datos_nino').select('*').eq('ingreso_id', ingresoId).maybeSingle(),
                    supabase.from('form1_derivacion').select('*').eq('ingreso_id', ingresoId).maybeSingle(),
                    supabase.from('form1_motivo').select('*').eq('ingreso_id', ingresoId).maybeSingle(),
                    supabase.from('derechos_vulnerados').select('*').eq('ingreso_id', ingresoId),
                    supabase.from('grupo_conviviente').select('*').eq('ingreso_id', ingresoId),
                    supabase.from('referentes_comunitarios').select('*').eq('ingreso_id', ingresoId),
                    supabase.from('form1_decision').select('*').eq('ingreso_id', ingresoId).maybeSingle(),
                    supabase.from('documentos').select('*').eq('ingreso_id', ingresoId)
                ]);

                setFormData(prev => ({
                    ...prev,
                    nino_id: nino.id,
                    nombre: nino.nombre,
                    apellido: nino.apellido,
                    dni: nino.dni?.toString() || '',
                    fecha_nacimiento: nino.fecha_nacimiento,
                    genero: nino.genero,
                    domicilio: form1DatosNino?.domicilio || nino.domicilio || '',
                    localidad: form1DatosNino?.localidad || nino.localidad || '',
                    barrio: nino.barrio || '', // Using barrio from nino directly for now
                    centro_salud: form1DatosNino?.centro_salud || nino.centro_salud || '',
                    historia_clinica: form1DatosNino?.historia_clinica || nino.historia_clinica || '',
                    tiene_cud: form1DatosNino?.tiene_cud || nino.tiene_cud || false,
                    cobertura_medica: form1DatosNino?.obra_social || nino.cobertura_medica || 'Publica',
                    observaciones_salud: form1DatosNino?.observaciones_salud || nino.observaciones_salud || '',
                    nivel_educativo: form1DatosNino?.nivel_educativo || nino.nivel_educativo || '',
                    curso: form1DatosNino?.curso || nino.curso || '',
                    turno: form1DatosNino?.turno || nino.turno || 'Mañana',
                    institucion_educativa: form1DatosNino?.escuela || nino.institucion_educativa || '',
                    asiste_regularmente: form1DatosNino?.asiste_regularmente ?? nino.asiste_regularmente ?? true,
                    trabaja: form1DatosNino?.trabaja ?? nino.trabaja ?? false,
                    trabajo_detalle: form1DatosNino?.trabajo_detalle || nino.trabajo_detalle || '',
                    expediente_id: exp.id,
                    spd_id: exp.servicio_proteccion_id,
                    zona_id: exp.zona_id,
                    derivacion: {
                        via_ingreso: derivacion?.via_ingreso || '',
                        institucion_id: derivacion?.institucion_id || '',
                        oficio_numero: derivacion?.oficio_numero || '',
                        nombre_solicitante: derivacion?.nombre_solicitante || '',
                        dni_solicitante: derivacion?.dni_solicitante || '',
                        cargo_solicitante: derivacion?.cargo_solicitante || ''
                    },
                    motivo_principal: motivo?.motivo_principal || '',
                    gravedad: motivo?.gravedad || 'Moderada',
                    relato_situacion: motivo?.descripcion_situacion || '',
                    vulneraciones: vulnerabilidadesData?.length ? vulnerabilidadesData : [{ derecho_id: '', indicador: '', observaciones: '' }],
                    grupo_familiar: grupoFamiliarData || [],
                    referentes: referentesData || [],
                    decision_id: decisionData?.decision_id || 'asesoramiento',
                    observaciones_cierre: decisionData?.observaciones || '',
                    archivos: documentosData?.map((d: any) => ({
                        id: d.id,
                        nombre: d.nombre,
                        tipo: d.tipo,
                        fecha: format(new Date(d.created_at), 'dd/MM/yyyy'),
                        size: 'N/A',
                        url: d.url
                    })) || []
                }));
                setNinoData(nino);
            } catch (error) {
                console.error('Error loading existing ingreso:', error);
            } finally {
                setIsLoadingData(false);
            }
        };

        const fetchNino = async (id: string) => {
            if (ingresoId) return; // Skip if we are editing
            setLoadingNino(true);
            const { data } = await supabase.from('ninos').select('*').eq('id', id).single();
            if (data) {
                setNinoData(data);
                // Pre-fill identity ONLY
                setFormData(prev => ({
                    ...prev,
                    nino_id: data.id,
                    nombre: data.nombre,
                    apellido: data.apellido,
                    dni: data.dni?.toString() || '',
                    fecha_nacimiento: data.fecha_nacimiento,
                    genero: data.genero
                }));
            }
            setLoadingNino(false);
        };

        if (ingresoId) {
            console.log('Loading existing ingreso:', ingresoId);
            void fetchExistingData();
        } else {
            const ninoId = searchParams.get('nino_id');
            if (ninoId) {
                console.log('Loading nino data for new case:', ninoId);
                void fetchNino(ninoId);
            }
        }
    }, [ingresoId, searchParams.toString()]);

    // Load initial auth and catalog data
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoadingAuth(true);
            try {
                // Try session first (faster rehydration)
                const { data: { session } } = await supabase.auth.getSession();
                let user = session?.user || null;

                // Then double check with getUser (real-time server verification)
                if (!user) {
                    const { data: { user: authUser } } = await supabase.auth.getUser();
                    user = authUser;
                }

                if (user) {
                    console.log('DEBUG: Auth detected for:', user.email);

                    // Fetch profile
                    const { data: profile } = await supabase
                        .from('usuarios')
                        .select('*, usuarios_roles(roles(nombre)), servicios_proteccion(id, nombre)')
                        .eq('id', user.id)
                        .maybeSingle();

                    if (!profile) {
                        console.warn('DEBUG: No profile record in public.usuarios for:', user.id);
                        // Emergency fallback for Dario
                        setUserProfile({
                            id: user.id,
                            email: user.email,
                            nombre_completo: 'Dario Anzaudo (Auth)',
                            usuarios_roles: user.email === 'darioanzaudo@gmail.com' ? [{ roles: { nombre: 'Administrador' } }] : []
                        });
                    } else {
                        setUserProfile(profile);
                    }
                } else {
                    console.log('DEBUG: No user detected in auth.');
                }
            } catch (err) {
                console.error('Error during auth rehydration:', err);
            } finally {
                setLoadingAuth(false);
            }
        };

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('DEBUG: Auth change event:', event);
            if (session?.user) fetchInitialData();
            else if (event === 'SIGNED_OUT') {
                setUserProfile(null);
                setLoadingAuth(false);
            }
        });

        fetchInitialData();

        // Always load SPDs if we think user might be admin (to avoid race hazard)
        const loadAllSpds = async () => {
            const { data } = await supabase.from('servicios_proteccion').select('id, nombre').order('nombre');
            if (data) setSpds(data);
        };
        loadAllSpds();

        const fetchCatalog = async () => {
            const { data } = await supabase.from('catalogo_derechos').select('*').order('categoria');
            if (data) setCatalogoDerechos(data);
        };
        fetchCatalog();

        return () => subscription.unsubscribe();
    }, []);

    // Auto-assign SPD for Professionals
    useEffect(() => {
        const roles = userProfile?.usuarios_roles?.map((ur: any) => ur.roles?.nombre) || [];
        const isAdmin = roles.includes('Administrador') || userProfile?.email === 'darioanzaudo@gmail.com';
        const isCoordinador = roles.includes('Coordinador');

        if (!isAdmin && !isCoordinador && userProfile?.servicio_proteccion_id && !formData.spd_id) {
            console.log('Auto-assigning SPD for Professional:', userProfile.servicio_proteccion_id);
            setFormData(prev => ({ ...prev, spd_id: userProfile.servicio_proteccion_id }));
        }
    }, [userProfile, formData.spd_id]);

    const steps = [
        { id: 1, name: 'Datos y Asignación', icon: 'person' },
        { id: 2, name: 'Salud y Educación', icon: 'medical_services' },
        { id: 3, name: 'Grupo Familiar', icon: 'group' },
        { id: 4, name: 'Red de Apoyo', icon: 'hub' },
        { id: 5, name: 'Motivo de Intervención', icon: 'error' },
        { id: 6, name: 'Vulneración de Derechos', icon: 'gavel' },
        { id: 7, name: 'Documentación', icon: 'description' },
        { id: 8, name: 'Cierre de Recepción', icon: 'fact_check' }
    ];

    const roles = userProfile?.usuarios_roles?.map((ur: any) => ur.roles?.nombre) || [];
    const isAdmin = roles.includes('Administrador') || userProfile?.email === 'darioanzaudo@gmail.com';
    const isCoordinador = roles.includes('Coordinador');
    const currentRole = isAdmin ? 'Administrador' : (isCoordinador ? 'Coordinador' : (roles[0] || 'Profesional'));

    const handleAddMember = () => {
        setEditingMemberIndex(null);
        setCurrentMember({
            dni: '',
            nombre: '',
            apellido: '',
            fecha_nacimiento: '',
            vinculo: '',
            telefono: '',
            convive: true,
            direccion: '',
            observaciones: ''
        });
        setIsDrawerOpen(true);
    };

    const handleEditMember = (index: number) => {
        setEditingMemberIndex(index);
        setCurrentMember(formData.grupo_familiar[index]);
        setIsDrawerOpen(true);
    };

    const handleSaveMember = () => {
        const newGroup = [...formData.grupo_familiar];
        if (editingMemberIndex !== null) {
            newGroup[editingMemberIndex] = currentMember;
        } else {
            newGroup.push(currentMember);
        }
        setFormData({ ...formData, grupo_familiar: newGroup });
        setIsDrawerOpen(false);
    };

    const handleRemoveMember = (index: number) => {
        const newGroup = formData.grupo_familiar.filter((_, i) => i !== index);
        setFormData({ ...formData, grupo_familiar: newGroup });
    };

    // Referentes Handlers
    const handleAddReferente = () => {
        setEditingReferenteIndex(null);
        setCurrentReferente({
            nombre: '',
            apellido: '',
            dni: '',
            vinculo: '',
            telefono: '',
            direccion: '',
            puede_acompanar: false,
            puede_aportar_info: true,
            es_referente_principal: false,
            observaciones: ''
        });
        setIsReferenteDrawerOpen(true);
    };

    const handleEditReferente = (index: number) => {
        setEditingReferenteIndex(index);
        setCurrentReferente(formData.referentes[index]);
        setIsReferenteDrawerOpen(true);
    };

    const handleSaveReferente = () => {
        const next = [...formData.referentes];
        if (editingReferenteIndex !== null) {
            next[editingReferenteIndex] = currentReferente;
        } else {
            next.push(currentReferente);
        }
        setFormData({ ...formData, referentes: next });
        setIsReferenteDrawerOpen(false);
    };

    const handleRemoveReferente = (index: number) => {
        const next = formData.referentes.filter((_, i) => i !== index);
        setFormData({ ...formData, referentes: next });
    };

    const handleAddVulneracion = () => {
        setFormData({
            ...formData,
            vulneraciones: [...formData.vulneraciones, { derecho_id: '', indicador: '', observaciones: '' }]
        });
    };

    const handleRemoveVulneracion = (index: number) => {
        const next = formData.vulneraciones.filter((_, i) => i !== index);
        setFormData({ ...formData, vulneraciones: next });
    };

    const updateVulneracion = (index: number, field: string, value: any) => {
        const next = [...formData.vulneraciones];
        next[index] = { ...next[index], [field]: value };
        setFormData({ ...formData, vulneraciones: next });
    };

    const handleFinalizarRecepcion = async () => {
        const validVulneraciones = formData.vulneraciones.filter(v => v.derecho_id);

        if (!formData.relato_situacion || validVulneraciones.length === 0) {
            alert('Por favor complete el relato de situación e identifique al menos un derecho vulnerado en el paso 6.');
            return;
        }

        setIsSaving(true);
        try {
            // 1. Ensure Nino exists and is updated
            let ninoId = formData.nino_id;
            const ninoPayload = {
                nombre: formData.nombre,
                apellido: formData.apellido,
                dni: formData.dni ? parseInt(String(formData.dni).replace(/\D/g, '')) : null,
                fecha_nacimiento: formData.fecha_nacimiento,
                genero: formData.genero,
                domicilio: formData.domicilio,
                localidad: formData.localidad,
                barrio: formData.barrio,
                centro_salud: formData.centro_salud,
                historia_clinica: formData.historia_clinica,
                tiene_cud: formData.tiene_cud,
                cobertura_medica: formData.cobertura_medica,
                nivel_educativo: formData.nivel_educativo,
                curso: formData.curso,
                turno: formData.turno,
                institucion_educativa: formData.institucion_educativa,
                asiste_regularmente: formData.asiste_regularmente,
                observaciones_salud: formData.observaciones_salud
            };

            if (!ninoId && ninoPayload.dni) {
                const { data: existingNino } = await supabase.from('ninos').select('id').eq('dni', ninoPayload.dni).maybeSingle();
                if (existingNino) {
                    ninoId = existingNino.id;
                    console.log('Found existing child by DNI:', ninoId);
                }
            }

            if (!ninoId) {
                const { data: newNino, error: ninoErr } = await supabase.from('ninos').insert(ninoPayload).select().single();
                if (ninoErr) throw ninoErr;
                ninoId = newNino.id;
            } else {
                const { error: ninoErr } = await supabase.from('ninos').update(ninoPayload).eq('id', ninoId);
                if (ninoErr) throw ninoErr;
            }

            // 2. Create/Get Expediente
            let expedienteId = formData.expediente_id;
            if (!expedienteId) {
                // Try to find an active expediente for this nino
                const { data: existingExp } = await supabase
                    .from('expedientes')
                    .select('id')
                    .eq('nino_id', ninoId)
                    .eq('activo', true)
                    .maybeSingle();

                if (existingExp) {
                    expedienteId = existingExp.id;
                    console.log('Using existing active expediente:', expedienteId);
                } else {
                    const year = new Date().getFullYear();
                    const randomNum = Math.floor(Math.random() * 90000) + 10000;
                    // Get SPD's zona_id if available
                    const spdId = formData.spd_id || userProfile?.servicios_proteccion?.id;
                    let zonaId = userProfile?.zona_id;

                    if (spdId && !zonaId) {
                        const { data: spdData } = await supabase.from('servicios_proteccion').select('zona_id').eq('id', spdId).single();
                        zonaId = spdData?.zona_id;
                    }

                    const { data: newExp, error: expErr } = await supabase.from('expedientes').insert({
                        nino_id: ninoId,
                        servicio_proteccion_id: spdId,
                        zona_id: zonaId,
                        profesional_id: userProfile?.id,
                        numero: `EXP-${year}-${randomNum}`,
                        fecha_apertura: new Date().toISOString().split('T')[0],
                        activo: true
                    }).select().single();

                    if (expErr) throw expErr;
                    expedienteId = newExp.id;
                }
            }

            // 3. Create/Update Ingreso
            const isClosing = formData.decision_id === 'asesoramiento';
            const today = new Date().toISOString().split('T')[0];
            let currentIngresoId = ingresoId;

            if (currentIngresoId) {
                // Update existing
                const { error: ingErr } = await supabase.from('ingresos').update({
                    etapa: formData.decision_id === 'abordaje_integral' ? 'ampliacion' : 'recepcion',
                    estado: isClosing ? 'cerrado' : 'abierto',
                    fecha_cierre: isClosing ? today : null,
                    motivo_cierre: isClosing ? 'Asesoramiento Finalizado' : null,
                    ultimo_usuario_id: userProfile?.id
                }).eq('id', currentIngresoId);
                if (ingErr) throw ingErr;
            } else {
                // Create new
                const { data: newIngreso, error: ingErr } = await supabase.from('ingresos').insert({
                    expediente_id: expedienteId,
                    profesional_asignado_id: userProfile?.id,
                    ultimo_usuario_id: userProfile?.id,
                    fecha_ingreso: today,
                    etapa: formData.decision_id === 'abordaje_integral' ? 'ampliacion' : 'recepcion',
                    estado: isClosing ? 'cerrado' : 'abierto',
                    fecha_cierre: isClosing ? today : null,
                    motivo_cierre: isClosing ? 'Asesoramiento Finalizado' : null
                }).select().single();

                if (ingErr) throw ingErr;
                currentIngresoId = newIngreso.id;
            }

            // 3.5 Update Expediente status if closing
            if (isClosing) {
                await supabase.from('expedientes').update({ activo: false }).eq('id', expedienteId);
            }

            // 4. Save related records (Delete & Re-insert or Upsert)
            // For simplicity and to avoid complex diffing, we'll use upsert with business logic
            const promises = [
                // Derivación
                supabase.from('form1_derivacion').upsert({
                    ingreso_id: currentIngresoId,
                    via_ingreso: formData.derivacion.via_ingreso,
                    oficio_numero: formData.derivacion.oficio_numero,
                    nombre_solicitante: formData.derivacion.nombre_solicitante,
                    cargo_solicitante: formData.derivacion.cargo_solicitante
                }, { onConflict: 'ingreso_id' }),

                // Motivo/Relato
                supabase.from('form1_motivo').upsert({
                    ingreso_id: currentIngresoId,
                    motivo_principal: formData.motivo_principal,
                    gravedad: formData.gravedad,
                    descripcion_situacion: formData.relato_situacion
                }, { onConflict: 'ingreso_id' }),

                // Decision
                supabase.from('form1_decision').upsert({
                    ingreso_id: currentIngresoId,
                    decision_id: formData.decision_id,
                    observaciones: formData.observaciones_cierre
                }, { onConflict: 'ingreso_id' }),
            ];

            // For collections (vulnerabilidades, familia, referentes)
            // It's safer to delete and re-insert or use IDs if we had them.
            // Let's do a clean replace for These related to Ingreso specifically.
            // For collections (vulnerabilidades, familia, referentes)
            // It's safer to delete and re-insert or use IDs if we had them.
            // Let's do a clean replace for These related to Ingreso specifically.
            await Promise.all([
                supabase.from('derechos_vulnerados').delete().eq('ingreso_id', currentIngresoId),
                supabase.from('referentes_comunitarios').delete().eq('ingreso_id', currentIngresoId),
                supabase.from('grupo_conviviente').delete().eq('ingreso_id', currentIngresoId),
                supabase.from('documentos').delete().eq('ingreso_id', currentIngresoId),
                supabase.from('form1_datos_nino').delete().eq('ingreso_id', currentIngresoId)
            ]);

            // Insert new collections
            const collectionPromises = [
                ...validVulneraciones.map(v => supabase.from('derechos_vulnerados').insert({
                    ingreso_id: currentIngresoId,
                    derecho_id: v.derecho_id,
                    grave: formData.gravedad === 'Urgente',
                    indicador: v.indicador,
                    observaciones: v.observaciones
                })),
                supabase.from('form1_datos_nino').insert({
                    ingreso_id: currentIngresoId,
                    domicilio: formData.domicilio,
                    localidad: formData.localidad,
                    centro_salud: formData.centro_salud,
                    historia_clinica: formData.historia_clinica,
                    tiene_cud: formData.tiene_cud,
                    obra_social: formData.cobertura_medica,
                    observaciones_salud: formData.observaciones_salud,
                    nivel_educativo: formData.nivel_educativo,
                    escuela: formData.institucion_educativa,
                    curso: formData.curso,
                    turno: formData.turno,
                    asiste_regularmente: formData.asiste_regularmente,
                    trabaja: formData.trabaja,
                    trabajo_detalle: formData.trabajo_detalle
                }),
                ...formData.grupo_familiar.map(m => supabase.from('grupo_conviviente').insert({
                    expediente_id: expedienteId,
                    ingreso_id: currentIngresoId,
                    nombre: m.nombre,
                    apellido: m.apellido,
                    dni: m.dni ? parseInt(String(m.dni).replace(/\D/g, '')) : null,
                    fecha_nacimiento: m.fecha_nacimiento || null,
                    vinculo: m.vinculo,
                    convive: m.convive,
                    telefono: m.telefono,
                    direccion: m.direccion,
                    observaciones: m.observaciones
                })),
                ...formData.referentes.map(r => supabase.from('referentes_comunitarios').insert({
                    expediente_id: expedienteId,
                    ingreso_id: currentIngresoId,
                    nombre: r.nombre,
                    apellido: r.apellido,
                    dni: r.dni ? parseInt(String(r.dni).replace(/\D/g, '')) : null,
                    vinculo: r.vinculo,
                    telefono: r.telefono,
                    direccion: r.direccion,
                    puede_acompanar: r.puede_acompanar,
                    puede_aportar_info: r.puede_aportar_info,
                    es_referente_principal: r.es_referente_principal,
                    observaciones: r.observaciones
                }))
            ];

            await Promise.all([...promises, ...collectionPromises]);

            // 5. Save Documents with real upload
            if (formData.archivos.length > 0) {
                for (const doc of formData.archivos) {
                    if (doc.file) {
                        try {
                            const fileExt = doc.file.name.split('.').pop();
                            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                            const filePath = `${expedienteId}/${fileName}`;

                            // 1. Upload to Storage
                            await supabase.storage.from('expedientes').upload(filePath, doc.file);

                            // 2. Get URL
                            const { data: { publicUrl } } = supabase.storage.from('expedientes').getPublicUrl(filePath);

                            // 3. Insert into DB
                            await supabase.from('documentos').insert({
                                ingreso_id: currentIngresoId,
                                nombre: doc.nombre,
                                tipo: fileExt?.toUpperCase() === 'PDF' ? 'PDF' : 'Imagen',
                                url: publicUrl,
                                origen: 'recepcion'
                            });
                        } catch (err) {
                            console.error('Error subiendo archivo en recepcion:', doc.nombre, err);
                        }
                    } else if (doc.url) {
                        // Si ya tenía una URL (edición), la mantenemos
                        await supabase.from('documentos').insert({
                            ingreso_id: currentIngresoId,
                            nombre: doc.nombre,
                            tipo: doc.tipo,
                            url: doc.url,
                            origen: 'recepcion'
                        });
                    }
                }
            }

            // 5. Register audit
            await supabase.from('auditoria').insert({
                tabla: 'ingresos',
                registro_id: currentIngresoId as unknown as number,
                accion: ingresoId ? 'UPDATE' : 'INSERT',
                usuario_id: userProfile?.id,
                datos_nuevos: { etapa: formData.decision_id === 'abordaje_integral' ? 'ampliacion' : 'recepcion', estado: isClosing ? 'cerrado' : 'abierto' }
            });

            alert('¡Recepción finalizada con éxito! El legajo ha sido creado.');
            navigate(`/expedientes/${expedienteId}/ingresos/${currentIngresoId}`);

        } catch (error: any) {
            console.error('Error saving reception:', error);
            alert(`Error al guardar: ${error.message || 'Error desconocido'}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingData) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-[#101722] gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Cargando datos de recepción...</p>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-140px)] -m-8 overflow-hidden font-display text-[#111418] dark:text-white bg-[#f5f7f8] dark:bg-[#101722]">
            {/* Sidebar Navigation */}
            <aside className="w-80 bg-white dark:bg-slate-900 border-r border-[#dbdfe6] dark:border-slate-800 flex flex-col overflow-y-auto hidden lg:flex">
                <div className="p-8">
                    <h2 className="text-xs font-bold text-[#60708a] mb-6 uppercase tracking-[0.2em]">Pasos del Proceso</h2>
                    <nav className="flex flex-col gap-2">
                        {steps.map((step) => {
                            const isActive = currentStep === step.id;
                            const isCompleted = currentStep > step.id;

                            return (
                                <div
                                    key={step.id}
                                    className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all border-l-4 ${isActive
                                        ? 'bg-primary/10 text-primary border-primary'
                                        : isCompleted
                                            ? 'text-green-600 bg-green-50/50 dark:bg-green-900/10 border-transparent'
                                            : 'text-[#60708a] border-transparent opacity-60'
                                        }`}
                                >
                                    <span className={`material-symbols-outlined text-xl ${isActive || isCompleted ? 'fill-current' : ''}`}>
                                        {isCompleted ? 'check_circle' : step.icon}
                                    </span>
                                    <p className={`text-sm tracking-tight ${isActive ? 'font-bold' : 'font-semibold'}`}>
                                        {step.id}. {step.name}
                                    </p>
                                </div>
                            );
                        })}
                    </nav>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-[#f5f7f8] dark:bg-[#101722] relative pb-24 px-8 pt-8">
                <div className="max-w-4xl mx-auto">
                    <Breadcrumbs
                        items={[
                            { label: 'Expedientes', path: '/expedientes' },
                            ...(formData.expediente_id ? [{ label: 'Historial de Ingresos', path: `/expedientes/${formData.expediente_id}/ingresos` }] : []),
                            ...(ingresoId ? [{ label: 'Detalle de Legajo', path: `/expedientes/` + (formData.expediente_id || '0') + `/ingresos/${ingresoId}` }] : []),
                            { label: 'Formulario de Recepción', active: true }
                        ]}
                    />
                    {/* DEBUG PANEL */}
                    <div className="mb-4 p-2 bg-black text-green-400 text-[10px] font-mono rounded flex items-center justify-between">
                        <div>
                            User: {userProfile?.email || 'Guest'} |
                            Roles: {userProfile?.usuarios_roles?.map((ur: any) => ur.roles?.nombre).join(', ') || 'No Roles'} |
                            Active Role: {currentRole} |
                            Status: {loadingAuth ? 'Checking...' : 'Ready'}
                            {isSaving && <span className="ml-4 animate-pulse text-yellow-500">| Persisting Data...</span>}
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-[8px] border border-zinc-600 uppercase"
                        >
                            Refrescar Sesión
                        </button>
                    </div>

                    {/* Progress Indicator */}
                    <div className="mb-10 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 shadow-sm transition-all">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-1">Etapa Actual</p>
                                <h2 className="text-2xl font-black tracking-tighter">{steps[currentStep - 1].name}</h2>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-[#60708a] uppercase tracking-widest">Paso {currentStep} de 8 ({(currentStep / 8 * 100).toFixed(0)}%)</p>
                            </div>
                        </div>
                        <div className="h-2 w-full bg-[#dbdfe6] dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_#3c83f6]" style={{ width: `${(currentStep / 8 * 100)}%` }}></div>
                        </div>
                    </div>

                    {/* Child Summary / Identification */}
                    {loadingNino ? (
                        <div className="mb-6 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 shadow-sm flex items-center justify-center gap-3">
                            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs font-bold text-[#60708a] uppercase tracking-[0.2em]">Cargando datos del niño/a...</span>
                        </div>
                    ) : (ninoData || formData.nino_id) ? (
                        <div className="mb-6 bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-primary shadow-sm flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined">child_care</span>
                                </div>
                                <div>
                                    <h4 className="font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                        {ninoData ? `${ninoData.apellido}, ${ninoData.nombre}` : 'Identificando...'}
                                    </h4>
                                    <p className="text-xs text-[#60708a] font-bold">
                                        DNI: {ninoData?.dni || 'Verificando...'} • {ninoData ? new Date().getFullYear() - new Date(ninoData.fecha_nacimiento).getFullYear() : '--'} años
                                    </p>
                                </div>
                            </div>
                            <button className="text-primary text-[10px] font-bold uppercase hover:underline">Cambiar Sujeto</button>
                        </div>
                    ) : (
                        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800 flex gap-4">
                            <span className="material-symbols-outlined text-amber-500">warning</span>
                            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                REGISTRO NUEVO: El niño/a no se encuentra en el sistema. Se crearán sus datos filiales al finalizar.
                            </p>
                        </div>
                    )}

                    {/* Step Content */}
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                {/* Datos Filiales del Niño (Only if NEW) */}
                                {(!ninoData && !formData.nino_id) && (
                                    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 shadow-sm overflow-hidden">
                                        <div className="px-8 py-5 border-b border-[#dbdfe6] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                            <h3 className="text-lg font-bold tracking-tight">Datos Filiales del Niño/a</h3>
                                        </div>
                                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block mb-2 text-xs font-bold text-[#60708a] uppercase tracking-widest">Nombres</label>
                                                <input
                                                    className="w-full h-12 rounded-lg border-[#dbdfe6] dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary px-4 font-medium"
                                                    value={formData.nombre}
                                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                                    placeholder="Nombres completos"
                                                />
                                            </div>
                                            <div>
                                                <label className="block mb-2 text-xs font-bold text-[#60708a] uppercase tracking-widest">Apellidos</label>
                                                <input
                                                    className="w-full h-12 rounded-lg border-[#dbdfe6] dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary px-4 font-medium"
                                                    value={formData.apellido}
                                                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                                                    placeholder="Apellidos completos"
                                                />
                                            </div>
                                            <div>
                                                <label className="block mb-2 text-xs font-bold text-[#60708a] uppercase tracking-widest">DNI</label>
                                                <input
                                                    className="w-full h-12 rounded-lg border-[#dbdfe6] dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary px-4 font-medium"
                                                    value={formData.dni}
                                                    onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                                                    placeholder="DNI sin puntos"
                                                />
                                            </div>
                                            <div>
                                                <label className="block mb-2 text-xs font-bold text-[#60708a] uppercase tracking-widest">Fecha de Nacimiento</label>
                                                <input
                                                    type="date"
                                                    className="w-full h-12 rounded-lg border-[#dbdfe6] dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary px-4 font-medium"
                                                    value={formData.fecha_nacimiento}
                                                    onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </section>
                                )}

                                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 shadow-sm overflow-hidden">
                                    <div className="px-8 py-5 border-b border-[#dbdfe6] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                        <h3 className="text-lg font-bold tracking-tight">Asignación de Servicio de Protección</h3>
                                    </div>
                                    <div className="p-8 space-y-6">
                                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex gap-4">
                                            <span className="material-symbols-outlined text-primary">info</span>
                                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                                {currentRole === 'Administrador' || currentRole === 'Coordinador'
                                                    ? 'Como Administrador/Coordinador, debe seleccionar el SPD responsable de este nuevo caso.'
                                                    : 'Como Profesional, el caso será automáticamente asignado a su Servicio de Protección (SPD) de origen.'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block mb-2 text-xs font-bold text-[#60708a] uppercase tracking-widest">SPD Responsable</label>
                                            {currentRole !== 'Administrador' && currentRole !== 'Coordinador' ? (
                                                <div className="w-full h-12 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center px-4 border border-[#dbdfe6] dark:border-slate-700 font-bold text-sm">
                                                    {userProfile?.servicios_proteccion?.nombre || 'Cargando...'}
                                                </div>
                                            ) : (
                                                <select
                                                    className="w-full h-12 rounded-lg border-[#dbdfe6] dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary font-bold text-sm px-4 outline-none"
                                                    value={formData.spd_id}
                                                    onChange={(e) => setFormData({ ...formData, spd_id: e.target.value })}
                                                >
                                                    <option value="">Seleccionar Servicio de Protección</option>
                                                    {spds.map(spd => <option key={spd.id} value={spd.id}>{spd.nombre}</option>)}
                                                </select>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 shadow-sm overflow-hidden">
                                    <div className="px-8 py-5 border-b border-[#dbdfe6] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                        <h3 className="text-lg font-bold tracking-tight">Origen de la Consulta / Derivación</h3>
                                    </div>
                                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block mb-2 text-xs font-bold text-[#60708a] uppercase tracking-widest">Vía de Ingreso</label>
                                            <select
                                                className="w-full h-12 rounded-lg border-[#dbdfe6] dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary font-bold text-sm px-4 outline-none"
                                                value={formData.derivacion.via_ingreso}
                                                onChange={(e) => setFormData({ ...formData, derivacion: { ...formData.derivacion, via_ingreso: e.target.value } })}
                                            >
                                                <option value="">Seleccione vía...</option>
                                                <option value="Oficio Judicial">Oficio Judicial</option>
                                                <option value="Demanda Espontánea">Demanda Espontánea / Presencial</option>
                                                <option value="Línea 102">Línea 102 / Telefónica</option>
                                                <option value="Institución">Derivación Institucional</option>
                                                <option value="Otro">Otro</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block mb-2 text-xs font-bold text-[#60708a] uppercase tracking-widest">Nro de Oficio / Expediente Externo</label>
                                            <input
                                                className="w-full h-12 rounded-lg border-[#dbdfe6] dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary px-4 font-medium"
                                                placeholder="Ej: SAC 12345/2024"
                                                value={formData.derivacion.oficio_numero}
                                                onChange={(e) => setFormData({ ...formData, derivacion: { ...formData.derivacion, oficio_numero: e.target.value } })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block mb-2 text-xs font-bold text-[#60708a] uppercase tracking-widest">Nro de Oficio / Expediente Externo</label>
                                            <input
                                                className="w-full h-12 rounded-lg border-[#dbdfe6] dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary px-4 font-medium"
                                                placeholder="Ej: 1234/2024"
                                                value={formData.derivacion.oficio_numero}
                                                onChange={(e) => setFormData({ ...formData, derivacion: { ...formData.derivacion, oficio_numero: e.target.value } })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block mb-2 text-xs font-bold text-[#60708a] uppercase tracking-widest">Nombre del Solicitante / Informante</label>
                                            <input
                                                className="w-full h-12 rounded-lg border-[#dbdfe6] dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary px-4 font-medium"
                                                placeholder="Nombre y Apellido"
                                                value={formData.derivacion.nombre_solicitante}
                                                onChange={(e) => setFormData({ ...formData, derivacion: { ...formData.derivacion, nombre_solicitante: e.target.value } })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block mb-2 text-xs font-bold text-[#60708a] uppercase tracking-widest">Cargo / Parentesco</label>
                                            <input
                                                className="w-full h-12 rounded-lg border-[#dbdfe6] dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary px-4 font-medium"
                                                placeholder="Ej: Tía, Director Escuela X, Juez..."
                                                value={formData.derivacion.cargo_solicitante}
                                                onChange={(e) => setFormData({ ...formData, derivacion: { ...formData.derivacion, cargo_solicitante: e.target.value } })}
                                            />
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="space-y-8">
                                {/* Domicilio */}
                                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 shadow-sm overflow-hidden">
                                    <div className="px-8 py-5 border-b border-[#dbdfe6] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                        <h3 className="text-lg font-bold tracking-tight">Domicilio y Localización</h3>
                                    </div>
                                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block mb-2 text-xs font-bold text-[#60708a] uppercase tracking-widest">Calle y Número</label>
                                            <input
                                                className="w-full h-12 rounded-lg border-[#dbdfe6] dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary px-4 font-medium"
                                                placeholder="Ej: Av. Rivadavia 1234, Piso 2 B"
                                                type="text"
                                                value={formData.domicilio}
                                                onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block mb-2 text-xs font-bold text-[#60708a] uppercase tracking-widest">Ciudad / Localidad</label>
                                            <select
                                                className="w-full h-12 rounded-lg border-[#dbdfe6] dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary px-4 font-medium"
                                                value={formData.localidad}
                                                onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                                            >
                                                <option value="">Seleccionar localidad</option>
                                                <option value="cordoba">Córdoba Capital</option>
                                                <option value="v_c_paz">Villa Carlos Paz</option>
                                                <option value="rio_iv">Río Cuarto</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block mb-2 text-xs font-bold text-[#60708a] uppercase tracking-widest">Nivel Educativo Actual</label>
                                            <select
                                                className="w-full h-12 rounded-lg border-[#dbdfe6] dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary px-4 font-medium"
                                                value={formData.nivel_educativo}
                                                onChange={(e) => setFormData({ ...formData, nivel_educativo: e.target.value })}
                                            >
                                                <option value="">Seleccionar nivel</option>
                                                <option value="Inicial">Inicial / Jardín</option>
                                                <option value="Primario">Primario</option>
                                                <option value="Secundario">Secundario</option>
                                                <option value="No escolarizado">No escolarizado</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block mb-2 text-xs font-bold text-[#60708a] uppercase tracking-widest">Grado / Año</label>
                                            <input
                                                className="w-full h-12 rounded-lg border-[#dbdfe6] dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary px-4 font-medium"
                                                placeholder="Ej: 3ro 'B'"
                                                type="text"
                                                value={formData.curso}
                                                onChange={(e) => setFormData({ ...formData, curso: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block mb-2 text-xs font-bold text-[#60708a] uppercase tracking-widest">Turno</label>
                                            <select
                                                className="w-full h-12 rounded-lg border-[#dbdfe6] dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary px-4 font-medium"
                                                value={formData.turno}
                                                onChange={(e) => setFormData({ ...formData, turno: e.target.value })}
                                            >
                                                <option value="Mañana">Mañana</option>
                                                <option value="Tarde">Tarde</option>
                                                <option value="Noche">Noche</option>
                                            </select>
                                        </div>
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block mb-2 text-xs font-bold text-[#60708a] uppercase tracking-widest">Nombre de la Institución Educativa</label>
                                            <input
                                                className="w-full h-12 rounded-lg border-[#dbdfe6] dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary px-4 font-medium"
                                                placeholder="Ej: Escuela Nro 15 'Gral. San Martín'"
                                                type="text"
                                                value={formData.institucion_educativa}
                                                onChange={(e) => setFormData({ ...formData, institucion_educativa: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex items-center gap-4 py-2">
                                            <div
                                                className={`size-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${formData.asiste_regularmente ? 'bg-primary text-white' : 'border-2 border-slate-300'}`}
                                                onClick={() => setFormData({ ...formData, asiste_regularmente: !formData.asiste_regularmente })}
                                            >
                                                {formData.asiste_regularmente && <span className="material-symbols-outlined text-sm font-black">check</span>}
                                            </div>
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Asiste regularmente</label>
                                        </div>
                                    </div>
                                </section>

                                {/* Salud */}
                                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 shadow-sm overflow-hidden">
                                    <div className="px-8 py-5 border-b border-[#dbdfe6] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                        <h3 className="text-lg font-bold tracking-tight">Información de Salud</h3>
                                    </div>
                                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block mb-2 text-xs font-bold text-[#60708a] uppercase tracking-widest">Centro de Salud de Referencia</label>
                                            <input
                                                className="w-full h-12 rounded-lg border-[#dbdfe6] dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary px-4 font-medium"
                                                placeholder="Nombre del hospital/entidad"
                                                value={formData.centro_salud}
                                                onChange={(e) => setFormData({ ...formData, centro_salud: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block mb-2 text-xs font-bold text-[#60708a] uppercase tracking-widest">Nº Historia Clínica</label>
                                            <input
                                                className="w-full h-12 rounded-lg border-[#dbdfe6] dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary px-4 font-medium"
                                                placeholder="Nro de registro médico"
                                                value={formData.historia_clinica}
                                                onChange={(e) => setFormData({ ...formData, historia_clinica: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex items-center gap-4 py-2">
                                            <div
                                                className={`size-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${formData.tiene_cud ? 'bg-primary text-white' : 'border-2 border-slate-300'}`}
                                                onClick={() => setFormData({ ...formData, tiene_cud: !formData.tiene_cud })}
                                            >
                                                {formData.tiene_cud && <span className="material-symbols-outlined text-sm font-black">check</span>}
                                            </div>
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Posee CUD (Certificado de Discapacidad)</label>
                                        </div>
                                        <div>
                                            <label className="block mb-2 text-xs font-bold text-[#60708a] uppercase tracking-widest">Obra Social / Prepaga</label>
                                            <input
                                                className="w-full h-12 rounded-lg border-[#dbdfe6] dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary px-4 font-medium"
                                                placeholder="Nombre de la cobertura"
                                                value={formData.cobertura_medica}
                                                onChange={(e) => setFormData({ ...formData, cobertura_medica: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {currentStep === 3 && (
                            <div className="space-y-6">
                                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 shadow-sm overflow-hidden">
                                    <div className="px-8 py-5 border-b border-[#dbdfe6] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                                        <div>
                                            <h3 className="text-lg font-bold tracking-tight">Grupo Conviviente</h3>
                                            <p className="text-xs text-[#60708a] font-medium uppercase tracking-widest mt-0.5">Personas que residen con el niño/a</p>
                                        </div>
                                        <button
                                            onClick={handleAddMember}
                                            className="bg-primary hover:bg-blue-600 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary/20 text-xs"
                                        >
                                            <span className="material-symbols-outlined text-lg">person_add</span>
                                            <span>Agregar Integrante</span>
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-[#dbdfe6] dark:border-slate-800">
                                                    <th className="px-8 py-4 text-[10px] font-black text-[#60708a] uppercase tracking-[0.2em]">Nombre y Apellido</th>
                                                    <th className="px-8 py-4 text-[10px] font-black text-[#60708a] uppercase tracking-[0.2em]">DNI</th>
                                                    <th className="px-8 py-4 text-[10px] font-black text-[#60708a] uppercase tracking-[0.2em]">Vínculo</th>
                                                    <th className="px-8 py-4 text-[10px] font-black text-[#60708a] uppercase tracking-[0.2em] text-center">Convive</th>
                                                    <th className="px-8 py-4 text-[10px] font-black text-[#60708a] uppercase tracking-[0.2em] text-right">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#dbdfe6] dark:divide-slate-800">
                                                {formData.grupo_familiar.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-8 py-12 text-center">
                                                            <div className="flex flex-col items-center gap-3 opacity-30">
                                                                <span className="material-symbols-outlined text-5xl">group_off</span>
                                                                <p className="text-sm font-bold uppercase tracking-widest">No hay integrantes registrados</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    formData.grupo_familiar.map((member, index) => (
                                                        <tr key={index} className="hover:bg-primary/[0.02] transition-colors group">
                                                            <td className="px-8 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                                                                        {member.nombre.substring(0, 2).toUpperCase()}
                                                                    </div>
                                                                    <span className="font-bold text-sm tracking-tight">{member.nombre}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-4 text-sm text-[#60708a] font-medium">{member.dni}</td>
                                                            <td className="px-8 py-4">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter bg-primary/10 text-primary">
                                                                    {member.vinculo}
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-4 text-center">
                                                                <span className={`material-symbols-outlined text-lg ${member.convive ? 'text-green-500' : 'text-slate-300'}`}>
                                                                    {member.convive ? 'check_circle' : 'cancel'}
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-4 text-right">
                                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => handleEditMember(index)}
                                                                        className="p-2 text-[#60708a] hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                                    >
                                                                        <span className="material-symbols-outlined text-xl">edit</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleRemoveMember(index)}
                                                                        className="p-2 text-[#60708a] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                    >
                                                                        <span className="material-symbols-outlined text-xl">delete</span>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    {formData.grupo_familiar.length > 0 && (
                                        <div className="px-8 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-[#dbdfe6] dark:border-slate-800 flex items-center justify-between">
                                            <p className="text-[10px] font-bold text-[#60708a] uppercase tracking-widest">Total: {formData.grupo_familiar.length} integrantes</p>
                                        </div>
                                    )}
                                </section>

                                {/* Side Drawer for adding/editing members */}
                                {isDrawerOpen && (
                                    <div className="fixed inset-0 z-[100] overflow-hidden">
                                        <div
                                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
                                            onClick={() => setIsDrawerOpen(false)}
                                        ></div>
                                        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                                            <div className="w-screen max-w-md animate-in slide-in-from-right duration-500 ease-out">
                                                <div className="h-full flex flex-col bg-white dark:bg-slate-900 shadow-2xl">
                                                    <div className="px-8 py-8 bg-primary text-white">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h2 className="text-2xl font-black tracking-tighter">
                                                                {editingMemberIndex !== null ? 'Editar Integrante' : 'Nuevo Integrante'}
                                                            </h2>
                                                            <button
                                                                onClick={() => setIsDrawerOpen(false)}
                                                                className="text-white/80 hover:text-white transition-all bg-white/10 p-2 rounded-full"
                                                            >
                                                                <span className="material-symbols-outlined">close</span>
                                                            </button>
                                                        </div>
                                                        <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">Vinculación al Grupo Familiar</p>
                                                    </div>

                                                    <div className="relative flex-1 px-8 py-10 overflow-y-auto space-y-8">
                                                        <div className="space-y-2">
                                                            <label className="block text-[10px] font-black text-[#60708a] uppercase tracking-widest">Número de DNI</label>
                                                            <div className="relative">
                                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#60708a] text-xl">badge</span>
                                                                <input
                                                                    className="w-full pl-12 h-14 rounded-2xl border-[#dbdfe6] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary font-bold transition-all outline-none"
                                                                    placeholder="Ej: 30.123.456"
                                                                    type="text"
                                                                    value={currentMember.dni}
                                                                    onChange={(e) => setCurrentMember({ ...currentMember, dni: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="block text-[10px] font-black text-[#60708a] uppercase tracking-widest">Nombres</label>
                                                            <div className="relative">
                                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#60708a] text-xl">person</span>
                                                                <input
                                                                    className="w-full pl-12 h-14 rounded-2xl border-[#dbdfe6] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary font-bold transition-all outline-none"
                                                                    placeholder="Nombres"
                                                                    type="text"
                                                                    value={currentMember.nombre}
                                                                    onChange={(e) => setCurrentMember({ ...currentMember, nombre: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="block text-[10px] font-black text-[#60708a] uppercase tracking-widest">Apellidos</label>
                                                            <div className="relative">
                                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#60708a] text-xl">person</span>
                                                                <input
                                                                    className="w-full pl-12 h-14 rounded-2xl border-[#dbdfe6] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary font-bold transition-all outline-none"
                                                                    placeholder="Apellidos"
                                                                    type="text"
                                                                    value={currentMember.apellido}
                                                                    onChange={(e) => setCurrentMember({ ...currentMember, apellido: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="block text-[10px] font-black text-[#60708a] uppercase tracking-widest">Fecha de Nacimiento</label>
                                                            <input
                                                                className="w-full px-4 h-14 rounded-2xl border-[#dbdfe6] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary font-bold transition-all outline-none"
                                                                type="date"
                                                                value={currentMember.fecha_nacimiento}
                                                                onChange={(e) => setCurrentMember({ ...currentMember, fecha_nacimiento: e.target.value })}
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="block text-[10px] font-black text-[#60708a] uppercase tracking-widest">Vínculo / Parentesco</label>
                                                            <select
                                                                className="w-full h-14 px-4 rounded-2xl border-[#dbdfe6] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary font-bold appearance-none outline-none"
                                                                value={currentMember.vinculo}
                                                                onChange={(e) => setCurrentMember({ ...currentMember, vinculo: e.target.value })}
                                                            >
                                                                <option value="">Seleccione una opción</option>
                                                                <option>Madre</option>
                                                                <option>Padre</option>
                                                                <option>Hermano/a</option>
                                                                <option>Abuelo/a</option>
                                                                <option>Tío/a</option>
                                                                <option>Padrastro/Madrastra</option>
                                                                <option>Otro</option>
                                                            </select>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="block text-[10px] font-black text-[#60708a] uppercase tracking-widest">Teléfono de Contacto</label>
                                                            <div className="relative">
                                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#60708a] text-xl">call</span>
                                                                <input
                                                                    className="w-full pl-12 h-14 rounded-2xl border-[#dbdfe6] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary font-bold transition-all outline-none"
                                                                    placeholder="11 0000-0000"
                                                                    type="tel"
                                                                    value={currentMember.telefono}
                                                                    onChange={(e) => setCurrentMember({ ...currentMember, telefono: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div
                                                            className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-[#dbdfe6] dark:border-slate-800 cursor-pointer"
                                                            onClick={() => setCurrentMember({ ...currentMember, convive: !currentMember.convive })}
                                                        >
                                                            <div className={`size-6 rounded-lg flex items-center justify-center transition-all ${currentMember.convive ? 'bg-primary text-white' : 'border-2 border-slate-300'}`}>
                                                                {currentMember.convive && <span className="material-symbols-outlined text-sm font-black">check</span>}
                                                            </div>
                                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">Convive actualmente en el hogar</label>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="block text-[10px] font-black text-[#60708a] uppercase tracking-widest">Dirección (Si no convive)</label>
                                                            <input
                                                                className="w-full px-4 h-14 rounded-2xl border-[#dbdfe6] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary font-bold transition-all outline-none"
                                                                placeholder="Calle, Nro, Localidad"
                                                                type="text"
                                                                value={currentMember.direccion}
                                                                onChange={(e) => setCurrentMember({ ...currentMember, direccion: e.target.value })}
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="block text-[10px] font-black text-[#60708a] uppercase tracking-widest">Observaciones / Datos Relevantes</label>
                                                            <textarea
                                                                className="w-full p-4 rounded-2xl border-[#dbdfe6] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary font-bold transition-all outline-none"
                                                                placeholder="Cualquier información adicional importante..."
                                                                rows={3}
                                                                value={currentMember.observaciones}
                                                                onChange={(e) => setCurrentMember({ ...currentMember, observaciones: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="px-8 py-8 border-t border-[#dbdfe6] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex gap-4">
                                                        <button
                                                            onClick={() => setIsDrawerOpen(false)}
                                                            className="flex-1 h-14 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 text-sm font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                                        >
                                                            Cancelar
                                                        </button>
                                                        <button
                                                            onClick={handleSaveMember}
                                                            className="flex-1 h-14 bg-primary text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
                                                        >
                                                            Guardar
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {currentStep === 4 && (
                            <div className="space-y-6">
                                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 shadow-sm overflow-hidden">
                                    <div className="px-8 py-5 border-b border-[#dbdfe6] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                                        <div>
                                            <h3 className="text-lg font-bold tracking-tight">Red de Apoyo y Referentes</h3>
                                            <p className="text-xs text-[#60708a] font-medium uppercase tracking-widest mt-0.5">Personas de confianza que pueden colaborar con el caso</p>
                                        </div>
                                        <button
                                            onClick={handleAddReferente}
                                            className="bg-primary hover:bg-blue-600 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary/20 text-xs"
                                        >
                                            <span className="material-symbols-outlined text-lg">hub</span>
                                            <span>Agregar Referente</span>
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-[#dbdfe6] dark:border-slate-800">
                                                    <th className="px-8 py-4 text-[10px] font-black text-[#60708a] uppercase tracking-[0.2em]">Referente</th>
                                                    <th className="px-8 py-4 text-[10px] font-black text-[#60708a] uppercase tracking-[0.2em]">Vínculo</th>
                                                    <th className="px-8 py-4 text-[10px] font-black text-[#60708a] uppercase tracking-[0.2em]">Contacto</th>
                                                    <th className="px-8 py-4 text-[10px] font-black text-[#60708a] uppercase tracking-[0.2em] text-center">Acompaña</th>
                                                    <th className="px-8 py-4 text-[10px] font-black text-[#60708a] uppercase tracking-[0.2em] text-right">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#dbdfe6] dark:divide-slate-800">
                                                {formData.referentes.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-8 py-12 text-center">
                                                            <div className="flex flex-col items-center gap-3 opacity-30">
                                                                <span className="material-symbols-outlined text-5xl">share_reviews</span>
                                                                <p className="text-sm font-bold uppercase tracking-widest">No hay referentes registrados</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    formData.referentes.map((ref, index) => (
                                                        <tr key={index} className="hover:bg-primary/[0.02] transition-colors group">
                                                            <td className="px-8 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`size-8 rounded-full border-2 flex items-center justify-center font-black text-[10px] ${ref.es_referente_principal ? 'bg-amber-500 border-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                                        {ref.es_referente_principal ? '★' : ref.nombre.substring(0, 2).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-bold text-sm tracking-tight block">{ref.nombre} {ref.apellido}</span>
                                                                        {ref.es_referente_principal && <span className="text-[8px] font-black text-amber-600 uppercase tracking-tighter">Referente Principal</span>}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-4">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                                    {ref.vinculo}
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-4 text-sm text-[#60708a] font-medium">{ref.telefono || 'Sin teléfono'}</td>
                                                            <td className="px-8 py-4 text-center">
                                                                <span className={`material-symbols-outlined text-lg ${ref.puede_acompanar ? 'text-green-500' : 'text-slate-200'}`}>
                                                                    {ref.puede_acompanar ? 'verified' : 'circle'}
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-4 text-right">
                                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => handleEditReferente(index)} className="p-2 text-[#60708a] hover:text-primary hover:bg-primary/10 rounded-lg"><span className="material-symbols-outlined text-xl">edit</span></button>
                                                                    <button onClick={() => handleRemoveReferente(index)} className="p-2 text-[#60708a] hover:text-red-500 hover:bg-red-50 rounded-lg"><span className="material-symbols-outlined text-xl">delete</span></button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>

                                {/* Referente Drawer */}
                                {isReferenteDrawerOpen && (
                                    <div className="fixed inset-0 z-[100] overflow-hidden">
                                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" onClick={() => setIsReferenteDrawerOpen(false)}></div>
                                        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                                            <div className="w-screen max-w-md animate-in slide-in-from-right duration-500 ease-out">
                                                <div className="h-full flex flex-col bg-white dark:bg-slate-900 shadow-2xl">
                                                    <div className="px-8 py-8 bg-slate-900 text-white">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h2 className="text-2xl font-black tracking-tighter">{editingReferenteIndex !== null ? 'Editar Referente' : 'Nuevo Referente'}</h2>
                                                            <button onClick={() => setIsReferenteDrawerOpen(false)} className="text-white/80 hover:text-white bg-white/10 p-2 rounded-full"><span className="material-symbols-outlined">close</span></button>
                                                        </div>
                                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Información de Contacto y Apoyo</p>
                                                    </div>
                                                    <div className="flex-1 px-8 py-10 overflow-y-auto space-y-6">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-black text-[#60708a] uppercase tracking-widest">Nombre</label>
                                                                <input className="w-full h-12 px-4 rounded-xl border-[#dbdfe6] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none" value={currentReferente.nombre} onChange={e => setCurrentReferente({ ...currentReferente, nombre: e.target.value })} />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-black text-[#60708a] uppercase tracking-widest">Apellido</label>
                                                                <input className="w-full h-12 px-4 rounded-xl border-[#dbdfe6] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none" value={currentReferente.apellido} onChange={e => setCurrentReferente({ ...currentReferente, apellido: e.target.value })} />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black text-[#60708a] uppercase tracking-widest">Vínculo / Relación</label>
                                                            <input placeholder="Ej: Vecino, Tía materna, Maestra..." className="w-full h-12 px-4 rounded-xl border-[#dbdfe6] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none" value={currentReferente.vinculo} onChange={e => setCurrentReferente({ ...currentReferente, vinculo: e.target.value })} />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black text-[#60708a] uppercase tracking-widest">Teléfono</label>
                                                            <input className="w-full h-12 px-4 rounded-xl border-[#dbdfe6] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none" value={currentReferente.telefono} onChange={e => setCurrentReferente({ ...currentReferente, telefono: e.target.value })} />
                                                        </div>

                                                        <div className="space-y-3 pt-4">
                                                            <label className="text-[10px] font-black text-[#60708a] uppercase tracking-widest">Capacidad de Intervención</label>
                                                            <div className="space-y-2">
                                                                {[
                                                                    { key: 'puede_acompanar', label: 'Puede brindar acompañamiento' },
                                                                    { key: 'puede_aportar_info', label: 'Puede aportar información clave' },
                                                                    { key: 'es_referente_principal', label: 'Es el referente principal fuera del hogar' }
                                                                ].map((opt) => (
                                                                    <div key={opt.key} className="flex items-center gap-4 p-3 rounded-xl border border-[#dbdfe6] dark:border-slate-800 cursor-pointer" onClick={() => setCurrentReferente({ ...currentReferente, [opt.key]: !currentReferente[opt.key as keyof typeof currentReferente] })}>
                                                                        <div className={`size-5 rounded flex items-center justify-center transition-all ${(currentReferente as any)[opt.key] ? 'bg-primary text-white' : 'border-2 border-slate-300'}`}>
                                                                            {(currentReferente as any)[opt.key] && <span className="material-symbols-outlined text-[14px] font-black">check</span>}
                                                                        </div>
                                                                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer">{opt.label}</label>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black text-[#60708a] uppercase tracking-widest">Observaciones</label>
                                                            <textarea rows={3} className="w-full p-4 rounded-xl border-[#dbdfe6] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold outline-none" value={currentReferente.observaciones} onChange={e => setCurrentReferente({ ...currentReferente, observaciones: e.target.value })} />
                                                        </div>
                                                    </div>
                                                    <div className="px-8 py-8 border-t border-[#dbdfe6] dark:border-slate-800 flex gap-4">
                                                        <button onClick={() => setIsReferenteDrawerOpen(false)} className="flex-1 h-12 rounded-xl border border-[#dbdfe6] dark:border-slate-800 text-[10px] font-black uppercase tracking-widest">Cancelar</button>
                                                        <button onClick={handleSaveReferente} className="flex-1 h-12 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl">Guardar</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {currentStep === 5 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Header / Context */}
                                <div className="flex flex-col gap-2">
                                    <h1 className="text-[#111418] dark:text-white text-3xl font-black leading-tight tracking-tight">Motivo de Consulta e Intervención</h1>
                                    <p className="text-[#60708a] dark:text-slate-400 text-base max-w-2xl">Categorice la vulneración principal y realice un relato detallado de la situación detectada.</p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    {/* Left Column: Categorization */}
                                    <div className="lg:col-span-12 flex flex-col gap-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <section className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 shadow-sm space-y-6">
                                                <h2 className="text-lg font-bold flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-primary">category</span>
                                                    Categorización del Motivo
                                                </h2>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block mb-2 text-[10px] font-black text-[#60708a] uppercase tracking-widest">Motivo Principal</label>
                                                        <select
                                                            className="w-full h-12 rounded-lg border-[#dbdfe6] dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary px-4 font-bold text-sm"
                                                            value={formData.motivo_principal}
                                                            onChange={(e) => setFormData({ ...formData, motivo_principal: e.target.value })}
                                                        >
                                                            <option value="">Seleccione el tipo de vulneración</option>
                                                            <option value="maltrato_fisico">Maltrato Físico</option>
                                                            <option value="negligencia">Negligencia / Descuido Grave</option>
                                                            <option value="abuso_sexual">Presunto Abuso Sexual (ASI)</option>
                                                            <option value="calle">Situación de Calle</option>
                                                            <option value="trabajo">Trabajo Infantil Prohibido</option>
                                                            <option value="identidad">Vulneración de Derecho a la Identidad</option>
                                                            <option value="educacion">Deserción Escolar Crónica</option>
                                                            <option value="otros">Otras vulneraciones</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block mb-2 text-[10px] font-black text-[#60708a] uppercase tracking-widest">Gravedad Inicial</label>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {['Leve', 'Moderada', 'Urgente'].map((g) => (
                                                                <button
                                                                    key={g}
                                                                    onClick={() => setFormData({ ...formData, gravedad: g })}
                                                                    className={`py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all border-2 ${formData.gravedad === g
                                                                        ? g === 'Urgente' ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-900/20' : 'border-primary bg-primary/10 text-primary'
                                                                        : 'border-slate-100 dark:border-slate-800 text-slate-400'
                                                                        }`}
                                                                >
                                                                    {g}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>

                                            <section className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-[#dbdfe6] dark:border-slate-800 shadow-sm space-y-6">
                                                <h2 className="text-lg font-bold flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-primary">gavel</span>
                                                    Derechos Afectados
                                                </h2>
                                                <p className="text-xs text-[#60708a] font-medium leading-relaxed">Seleccione los derechos que se consideran vulnerados en este primer contacto.</p>

                                                <div className="flex flex-wrap gap-2">
                                                    {[
                                                        { id: 81, label: 'Vida e Integridad' },
                                                        { id: 96, label: 'Identidad' },
                                                        { id: 109, label: 'Salud' },
                                                        { id: 115, label: 'Educación' },
                                                        { id: 121, label: 'Libertad' },
                                                        { id: 123, label: 'Juego' }
                                                    ].map((d) => {
                                                        const isSelected = formData.derechos_seleccionados.includes(d.id);
                                                        return (
                                                            <button
                                                                key={d.id}
                                                                onClick={() => {
                                                                    const current = formData.derechos_seleccionados;
                                                                    const next = isSelected
                                                                        ? current.filter(id => id !== d.id)
                                                                        : [...current, d.id];
                                                                    setFormData({ ...formData, derechos_seleccionados: next });
                                                                }}
                                                                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-tight transition-all border ${isSelected
                                                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                                                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[#60708a]'
                                                                    }`}
                                                            >
                                                                {d.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </section>
                                        </div>

                                        {/* Narrative Description Full Width */}
                                        <section className={`bg-white dark:bg-slate-900 rounded-2xl border-2 transition-all shadow-sm overflow-hidden ${formData.relato_situacion.length < 50 ? 'border-amber-200 dark:border-amber-900/30' : 'border-primary/20 dark:border-slate-800'}`}>
                                            <div className="px-8 py-5 border-b border-[#dbdfe6] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                                                <h2 className="text-lg font-bold flex items-center gap-2 tracking-tight">
                                                    <span className="material-symbols-outlined text-primary">description</span>
                                                    Relato de la Situación
                                                </h2>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-widest">
                                                        {formData.relato_situacion.length} / 5000
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-0">
                                                <textarea
                                                    className="w-full min-h-[400px] p-8 focus:ring-0 border-none bg-transparent text-lg leading-relaxed font-medium placeholder-slate-300 dark:placeholder-slate-700 resize-none custom-scrollbar"
                                                    placeholder="Inicie el relato aquí indicando fecha, lugar, personas involucradas y una cronología objetiva de los hechos reportados..."
                                                    value={formData.relato_situacion}
                                                    onChange={(e) => setFormData({ ...formData, relato_situacion: e.target.value })}
                                                />
                                            </div>

                                            <div className="px-8 py-4 bg-amber-50 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-900/20 flex items-start gap-3">
                                                <span className="material-symbols-outlined text-amber-500 mt-0.5">info</span>
                                                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-tight uppercase tracking-widest">
                                                    El relato es la base fundamental para la toma de medidas. Evite juicios de valor y sea lo más objetivo posible.
                                                </p>
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 6 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                                <div className="flex flex-col gap-2">
                                    <h1 className="text-[#121617] dark:text-white text-3xl font-black leading-tight tracking-tight">Identificación de Derechos Vulnerados</h1>
                                    <p className="text-[#658086] dark:text-gray-400 text-base font-normal">Registre y categorice los derechos detectados para el informe técnico final.</p>
                                </div>

                                {formData.vulneraciones.length === 0 && (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex gap-3 items-start">
                                            <span className="material-symbols-outlined text-amber-600 dark:text-amber-500 mt-0.5">warning</span>
                                            <div>
                                                <p className="text-amber-900 dark:text-amber-200 text-base font-bold leading-tight uppercase tracking-widest text-[10px]">Acción Requerida</p>
                                                <p className="text-amber-800 dark:text-amber-400/80 text-xs font-bold leading-normal">Se debe identificar al menos un derecho vulnerado para procesar el ingreso.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    {formData.vulneraciones.map((vuln, index) => {
                                        const categories = Array.from(new Set(catalogoDerechos.map(d => d.categoria)));
                                        const currentRight = catalogoDerechos.find(d => d.id.toString() === vuln.derecho_id.toString());
                                        const subcategories = vuln.categoria_temp
                                            ? catalogoDerechos.filter(d => d.categoria === vuln.categoria_temp)
                                            : currentRight
                                                ? catalogoDerechos.filter(d => d.categoria === currentRight.categoria)
                                                : [];

                                        return (
                                            <div key={index} className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-[#dbdfe6] dark:border-slate-800 overflow-hidden transition-all group">
                                                <div className="absolute top-0 left-0 w-2 h-full bg-primary/20 group-hover:bg-primary transition-all"></div>
                                                <div className="p-8">
                                                    <div className="flex justify-between items-start mb-8">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm">{index + 1}</div>
                                                            <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-[0.05em]">Registro de Vulneración</h3>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveVulneracion(index)}
                                                            className="p-2 text-slate-300 hover:text-red-500 transition-all hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                        >
                                                            <span className="material-symbols-outlined">delete_forever</span>
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-[#60708a] uppercase tracking-widest">Derecho (Categoría)</label>
                                                            <select
                                                                className="w-full h-14 rounded-2xl border-[#dbdfe6] dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary font-bold px-4 outline-none transition-all"
                                                                value={vuln.categoria_temp || currentRight?.categoria || ''}
                                                                onChange={(e) => updateVulneracion(index, 'categoria_temp', e.target.value)}
                                                            >
                                                                <option value="">Seleccione Categoría...</option>
                                                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                            </select>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-[#60708a] uppercase tracking-widest">Subcategoría específica</label>
                                                            <select
                                                                className="w-full h-14 rounded-2xl border-[#dbdfe6] dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary font-bold px-4 outline-none transition-all disabled:opacity-50"
                                                                value={vuln.derecho_id}
                                                                disabled={!vuln.categoria_temp && !currentRight}
                                                                onChange={(e) => updateVulneracion(index, 'derecho_id', e.target.value)}
                                                            >
                                                                <option value="">Seleccione Subcategoría...</option>
                                                                {subcategories.map(d => <option key={d.id} value={d.id}>{d.subcategoria}</option>)}
                                                            </select>
                                                        </div>

                                                        <div className="md:col-span-2 space-y-2">
                                                            <label className="text-[10px] font-black text-[#60708a] uppercase tracking-widest">Indicador de Vulneración</label>
                                                            <input
                                                                className="w-full h-14 rounded-2xl border-[#dbdfe6] dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary font-bold px-4 outline-none transition-all"
                                                                placeholder="Ej: Falta de controles pediátricos en los últimos 12 meses"
                                                                type="text"
                                                                value={vuln.indicador}
                                                                onChange={(e) => updateVulneracion(index, 'indicador', e.target.value)}
                                                            />
                                                        </div>

                                                        <div className="md:col-span-2 space-y-2">
                                                            <label className="text-[10px] font-black text-[#60708a] uppercase tracking-widest">Observación Técnica y Justificación</label>
                                                            <textarea
                                                                className="w-full p-6 rounded-2xl border-[#dbdfe6] dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary font-bold outline-none transition-all min-h-[140px] resize-none"
                                                                placeholder="Describa el contexto y la justificación técnica de por qué este derecho está comprometido..."
                                                                value={vuln.observaciones}
                                                                onChange={(e) => updateVulneracion(index, 'observaciones', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex flex-col items-center gap-6 py-6">
                                    <button
                                        onClick={handleAddVulneracion}
                                        className="flex items-center gap-2 px-10 h-16 rounded-2xl bg-primary text-white text-base font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-2xl">add_circle</span>
                                        <span>Agregar Otro Derecho</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {currentStep === 7 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                                <div className="flex flex-col gap-2">
                                    <h1 className="text-[#121617] dark:text-white text-3xl font-black leading-tight tracking-tight">Documentación de Soporte</h1>
                                    <p className="text-[#658086] dark:text-gray-400 text-base font-normal">Adjunte archivos relevantes como oficios, informes previos o actas.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center group hover:border-primary transition-all cursor-pointer overflow-hidden relative">
                                        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-all"></div>
                                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-4xl">cloud_upload</span>
                                        </div>
                                        <h3 className="text-xl font-black tracking-tight mb-2 uppercase tracking-widest text-xs">Subir Documento</h3>
                                        <p className="text-slate-500 text-xs font-medium max-w-[200px]">PDF, JPG o PNG hasta 10MB</p>
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setFormData({
                                                        ...formData,
                                                        archivos: [...formData.archivos, {
                                                            file: file, // Guardamos el objeto File real
                                                            nombre: file.name,
                                                            tipo: file.type.split('/')[1]?.toUpperCase() || 'FILE',
                                                            fecha: new Date().toLocaleDateString(),
                                                            size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
                                                        }]
                                                    });
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Archivos Adjuntos ({formData.archivos.length})</h4>
                                        {formData.archivos.length === 0 ? (
                                            <div className="h-40 bg-slate-100/50 dark:bg-slate-800/30 rounded-3xl flex items-center justify-center border border-slate-100 dark:border-slate-800">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Sin archivos cargados</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {formData.archivos.map((file, idx) => (
                                                    <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl flex items-center justify-center">
                                                                <span className="material-symbols-outlined text-xl">description</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold truncate max-w-[150px]">{file.nombre}</p>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{file.tipo} • {file.size}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => setFormData({ ...formData, archivos: formData.archivos.filter((_, i) => i !== idx) })}
                                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined">delete</span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 8 && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                                {/* Left Column: Decision Selection */}
                                <div className="lg:col-span-8 space-y-8">
                                    <header>
                                        <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white mb-2">Decisión Inicial y Cierre</h2>
                                        <p className="text-slate-600 dark:text-slate-400 max-w-2xl font-medium leading-relaxed">
                                            Finalice la recepción del caso determinando el curso de acción inmediato. Esta decisión definirá los siguientes pasos técnicos del equipo interdisciplinario.
                                        </p>
                                    </header>

                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#60708a] dark:text-slate-400">Seleccione la acción a seguir</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {[
                                                { id: 'asesoramiento', label: 'Asesoramiento', icon: 'info', desc: 'Orientación legal o técnica sin apertura de intervención directa.', color: 'blue' },
                                                { id: 'abordaje_integral', label: 'Abordaje Integral', icon: 'assignment_turned_in', desc: 'Apertura formal de legajo para intervención sostenida.', color: 'emerald' }
                                            ].map((opt) => (
                                                <label key={opt.id} className="group relative cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="decision"
                                                        className="peer sr-only"
                                                        checked={formData.decision_id === opt.id}
                                                        onChange={() => setFormData({ ...formData, decision_id: opt.id as any })}
                                                    />
                                                    <div className="h-full p-6 bg-white dark:bg-slate-800 border-2 border-transparent peer-checked:border-primary peer-checked:ring-4 peer-checked:ring-primary/10 rounded-2xl transition-all shadow-sm hover:shadow-md dark:shadow-slate-900/50">
                                                        <div className={`w-12 h-12 bg-${opt.color}-50 dark:bg-${opt.color}-900/20 text-${opt.color}-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                                            <span className="material-symbols-outlined">{opt.icon}</span>
                                                        </div>
                                                        <h4 className="font-black text-lg mb-2 tracking-tight">{opt.label}</h4>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{opt.desc}</p>
                                                        <div className="absolute top-4 right-4 opacity-0 peer-checked:opacity-100 transition-opacity">
                                                            <span className="material-symbols-outlined text-primary fill-current">check_circle</span>
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#60708a] dark:text-slate-400">Observaciones y fundamentación</label>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${formData.observaciones_cierre.length < 50 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {formData.observaciones_cierre.length} / 50 carácteres min.
                                            </span>
                                        </div>
                                        <textarea
                                            className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-6 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all resize-none dark:text-white font-medium text-lg leading-relaxed min-h-[250px]"
                                            placeholder="Describa los motivos técnicos de la decisión tomada..."
                                            value={formData.observaciones_cierre}
                                            onChange={(e) => setFormData({ ...formData, observaciones_cierre: e.target.value })}
                                        />
                                    </section>
                                </div>

                                {/* Right Column: Summary Panel */}
                                <aside className="lg:col-span-4 space-y-6">
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 border border-[#dbdfe6] dark:border-slate-700 overflow-hidden sticky top-8">
                                        <div className="p-6 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                            <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-widest">
                                                <span className="material-symbols-outlined text-lg">fact_check</span>
                                                Resumen de Carga
                                            </h3>
                                        </div>
                                        <div className="p-6 space-y-6">
                                            <ul className="space-y-4">
                                                {[
                                                    { label: 'Datos del Niño/a', ok: !!(ninoData || (formData.nombre && formData.dni)), step: 1 },
                                                    { label: 'Origen / Derivación', ok: !!formData.derivacion.via_ingreso, step: 1 },
                                                    { label: 'Atención Sanitaria', ok: !!formData.centro_salud, step: 2 },
                                                    { label: 'Grupo Familiar', ok: formData.grupo_familiar.length > 0, step: 3 },
                                                    { label: 'Red de Apoyo', ok: formData.referentes.length > 0, step: 4 },
                                                    { label: 'Relato de Situación', ok: formData.relato_situacion.length > 100, step: 5 },
                                                    { label: 'Valoración de Derechos', ok: formData.vulneraciones.length > 0, step: 6 }
                                                ].map((check, i) => (
                                                    <li key={i} className="flex items-center justify-between group">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${check.ok ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-500'}`}>
                                                                <span className="material-symbols-outlined text-[14px] font-black">{check.ok ? 'done' : 'priority_high'}</span>
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300 tracking-tight">{check.label}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => setCurrentStep(check.step)}
                                                            className="text-[10px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest"
                                                        >
                                                            Revisar
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </aside>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Sticky Action Footer */}
            <footer className="h-20 bg-white dark:bg-slate-900 border-t border-[#dbdfe6] dark:border-slate-800 fixed bottom-0 left-0 right-0 z-50 flex items-center px-12 shadow-[0_-5px_20px_-15px_rgba(0,0,0,0.1)]">
                <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[#60708a] text-[10px] font-bold uppercase tracking-widest">
                        <span className="material-symbols-outlined text-green-500 text-lg fill-current">cloud_done</span>
                        Auto-guardado activo
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : navigate('/expedientes/nuevo')}
                            className="px-6 h-11 flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[#111418] dark:text-white font-bold text-xs transition-all uppercase tracking-wider"
                        >
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                            {currentStep === 1 ? 'Cancelar' : 'Anterior'}
                        </button>
                        <button
                            onClick={() => {
                                if (currentStep < 8) {
                                    setCurrentStep(currentStep + 1);
                                } else {
                                    void handleFinalizarRecepcion();
                                }
                            }}
                            disabled={currentStep === 8 && (formData.observaciones_cierre.length < 10 || isSaving)}
                            className="px-8 h-11 flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-lg shadow-primary/20 transition-all uppercase tracking-widest disabled:opacity-50"
                        >
                            {currentStep === 8 ? (isSaving ? 'Guardando...' : 'Finalizar Recepción') : 'Siguiente'}
                            <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default FormularioRecepcion;
