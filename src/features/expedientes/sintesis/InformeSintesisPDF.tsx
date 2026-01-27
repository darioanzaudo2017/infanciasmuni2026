
import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

// Register a font (optional, using default Helvetica for now to ensure compatibility)
// Font.register({ family: 'Roboto', src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf' });

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 11,
        color: '#333',
        lineHeight: 1.5,
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        textTransform: 'uppercase',
    },
    subtitle: {
        fontSize: 10,
        color: '#6b7280',
        marginTop: 4,
    },
    section: {
        marginBottom: 15,
        padding: 10,
        backgroundColor: '#f9fafa',
        borderRadius: 4,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#374151',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingBottom: 4,
    },
    label: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#4b5563',
        marginBottom: 2,
        marginTop: 6,
        textTransform: 'uppercase',
    },
    value: {
        fontSize: 11,
        marginBottom: 4,
        textAlign: 'justify',
    },
    row: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 6,
    },
    column: {
        flex: 1,
    },
    tag: {
        fontSize: 10,
        padding: '4px 8px',
        backgroundColor: '#e5e7eb',
        borderRadius: 10,
        marginRight: 5,
        marginBottom: 5,
        color: '#374151',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 4,
    },
    signatureSection: {
        marginTop: 40,
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 20,
    },
    signatureBox: {
        alignItems: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#9ca3af',
        width: '40%',
    },
    signatureName: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    signatureRole: {
        fontSize: 8,
        color: '#6b7280',
    }
});

interface InformeSintesisPDFProps {
    ingreso: any;
    informe: any;
    vulneraciones: any[];
    users: any[];
    motivoRecepcion: any;
    datosNino: any;
}

const InformeSintesisPDF: React.FC<InformeSintesisPDFProps> = ({
    ingreso,
    informe,
    vulneraciones,
    users,
    motivoRecepcion,
    datosNino
}) => {

    // Filter selected professionals
    const signingProfessionals = users.filter(u => (informe.profesionales_ids || []).includes(u.id));

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Informe Síntesis</Text>
                        <Text style={styles.subtitle}>Protección de Derechos NNYA</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.label}>Fecha: {new Date().toLocaleDateString('es-AR')}</Text>
                        <Text style={styles.label}>Expediente: {ingreso?.expediente_numero || 'S/D'}</Text>
                    </View>
                </View>

                {/* Datos del Niño */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Datos del Niño/a/Adolescente</Text>
                    <View style={styles.row}>
                        <View style={styles.column}>
                            <Text style={styles.label}>Nombre Completo</Text>
                            <Text style={styles.value}>{ingreso?.nino_nombre} {ingreso?.nino_apellido}</Text>
                        </View>
                        <View style={styles.column}>
                            <Text style={styles.label}>Edad</Text>
                            <Text style={styles.value}>{ingreso?.nino_edad ? `${ingreso.nino_edad} años` : 'S/D'}</Text>
                        </View>
                        <View style={styles.column}>
                            <Text style={styles.label}>DNI</Text>
                            <Text style={styles.value}>{ingreso?.nino_dni || 'S/D'}</Text>
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.column}>
                            <Text style={styles.label}>Domicilio Actual</Text>
                            <Text style={styles.value}>{ingreso?.nino_localidad || 'S/D'}</Text>
                        </View>
                    </View>
                </View>

                {/* Antecedentes */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Antecedentes e Información de Ingreso</Text>

                    <Text style={styles.label}>Motivo de Intervención</Text>
                    <Text style={styles.value}>{motivoRecepcion?.motivo_principal || 'No especificado'}</Text>
                    <Text style={{ ...styles.value, fontStyle: 'italic', color: '#555', marginBottom: 10 }}>"{motivoRecepcion?.descripcion_situacion || 'Sin descripción'}"</Text>

                    <View style={styles.row}>
                        <View style={styles.column}>
                            <Text style={styles.label}>Educación</Text>
                            <Text style={styles.value}>Nivel: {datosNino?.nivel_educativo || '-'}</Text>
                            <Text style={styles.value}>Escuela: {datosNino?.escuela || '-'}</Text>
                        </View>
                        <View style={styles.column}>
                            <Text style={styles.label}>Salud</Text>
                            <Text style={styles.value}>Centro: {datosNino?.centro_salud || '-'}</Text>
                            <Text style={styles.value}>CUD: {datosNino?.tiene_cud ? 'Sí' : 'No'}</Text>
                        </View>
                    </View>
                </View>

                {/* Fundamento */}
                <View style={[styles.section, { backgroundColor: '#fff', border: '1px solid #eee' }]}>
                    <Text style={styles.sectionTitle}>Fundamento de la Intervención</Text>
                    <Text style={styles.value}>{informe.fundamento_normativo || 'Sin contenido'}</Text>
                </View>

                {/* Valoración */}
                <View style={[styles.section, { backgroundColor: '#fff', border: '1px solid #eee' }]}>
                    <Text style={styles.sectionTitle}>Valoración Integral</Text>
                    <Text style={styles.value}>{informe.valoracion_integral || 'Sin contenido'}</Text>
                </View>

                {/* Plan de Acción */}
                <View style={[styles.section, { backgroundColor: '#fff', border: '1px solid #eee' }]}>
                    <Text style={styles.sectionTitle}>Plan de Acción</Text>
                    <Text style={styles.value}>{informe.plan_accion || 'Sin contenido'}</Text>
                </View>

                {/* Derechos Vulnerados */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Derechos Vulnerados</Text>
                    <View style={styles.tagsContainer}>
                        {vulneraciones.length > 0 ? (
                            vulneraciones.map((vul, idx) => (
                                <Text key={idx} style={styles.tag}>
                                    {vul.catalogo_derechos?.categoria} - {vul.catalogo_derechos?.subcategoria}
                                </Text>
                            ))
                        ) : (
                            <Text style={styles.value}>No hay derechos marcados.</Text>
                        )}
                    </View>
                </View>

                {/* Firmas */}
                <View style={styles.signatureSection}>
                    {signingProfessionals.length > 0 ? signingProfessionals.map((user: any) => (
                        <View key={user.id} style={styles.signatureBox}>
                            <Text style={styles.signatureName}>{user.nombre_completo}</Text>
                            {/* <Text style={styles.signatureRole}>{user.rol || 'Profesional'}</Text> */}
                        </View>
                    )) : (
                        <Text style={{ fontSize: 10, fontStyle: 'italic', color: 'red' }}>Sin firmas profesionales seleccionadas</Text>
                    )}
                </View>

            </Page>
        </Document>
    );
};

export default InformeSintesisPDF;
