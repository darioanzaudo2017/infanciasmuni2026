import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import PlanificacionAmpliacion from './PlanificacionAmpliacion';
import AccionesAmpliacion from './AccionesAmpliacion';

const AmpliacionContainer: React.FC = () => {
    const { ingresoId } = useParams();
    const [loading, setLoading] = useState(true);
    const [planificacion, setPlanificacion] = useState<any>(null);
    const [ingreso, setIngreso] = useState<any>(null);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const [
                { data: ingData },
                { data: planData }
            ] = await Promise.all([
                supabase.from('ingresos').select('*, expedientes(*, ninos(*))').eq('id', ingresoId).single(),
                supabase.from('form2_planificacion').select('*, form2_equipo(usuario_id)').eq('ingreso_id', ingresoId).maybeSingle()
            ]);

            setIngreso(ingData);
            setPlanificacion(planData);
        } catch (error) {
            console.error('Error fetching ampliacion status:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (ingresoId) {
            void fetchStatus();
        }
    }, [ingresoId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#101722]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!ingreso) return <div>No se encontró el ingreso.</div>;

    // Si no hay planificación, mostramos el formulario de planificación
    if (!planificacion) {
        return (
            <PlanificacionAmpliacion
                ingreso={ingreso}
                onPlanned={fetchStatus}
            />
        );
    }

    // Si ya existe la planificación, mostramos el dashboard de acciones/historial
    return (
        <AccionesAmpliacion
            ingreso={ingreso}
            planificacion={planificacion}
        />
    );
};

export default AmpliacionContainer;
