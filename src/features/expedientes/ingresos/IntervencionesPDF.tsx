
import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

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
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        textTransform: 'uppercase',
    },
    subtitle: {
        fontSize: 10,
        color: '#6b7280',
        marginTop: 4,
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
    },
    itemContainer: {
        marginBottom: 15,
        padding: 15,
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 4,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        paddingBottom: 5,
    },
    itemTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#111',
    },
    itemMeta: {
        fontSize: 10,
        color: '#666',
    },
    contentBox: {
        marginTop: 5,
        padding: 8,
        backgroundColor: '#f9fafb',
        borderRadius: 4,
    },
    contentText: {
        fontSize: 10,
        fontStyle: 'italic',
        color: '#374151',
        lineHeight: 1.6,
    },
    empty: {
        textAlign: 'center',
        color: '#999',
        marginTop: 50,
        fontStyle: 'italic',
    }
});

interface IntervencionesPDFProps {
    ingreso: any;
    intervenciones: any[];
}

const IntervencionesPDF: React.FC<IntervencionesPDFProps> = ({ ingreso, intervenciones }) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Registro de Intervenciones</Text>
                        <Text style={styles.subtitle}>Historial de Entrevistas y Acciones</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.label}>Expediente: {ingreso?.expediente_numero || 'S/D'}</Text>
                        <Text style={styles.value}>{ingreso?.nino_nombre} {ingreso?.nino_apellido}</Text>
                    </View>
                </View>

                {intervenciones && intervenciones.length > 0 ? (
                    intervenciones.map((item, idx) => (
                        <View key={idx} style={styles.itemContainer}>
                            <View style={styles.itemHeader}>
                                <View>
                                    <Text style={styles.itemTitle}>{item.entrevistado_nombre || 'Sin nombre'}</Text>
                                    <Text style={styles.itemMeta}>{item.vinculo} • {item.tipo_entrevistado}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.itemTitle}>{format(new Date(item.fecha), "dd/MM/yyyy", { locale: es })}</Text>
                                    <Text style={styles.itemMeta}>{item.asistencia}</Text>
                                </View>
                            </View>

                            <Text style={styles.label}>Registro / Observaciones:</Text>
                            <View style={styles.contentBox}>
                                <Text style={styles.contentText}>{item.registro || 'Sin registro detallado.'}</Text>
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={styles.empty}>No hay intervenciones registradas en el historial.</Text>
                )}

                <Text style={{ position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 9, color: '#999' }}>
                    Documento generado el {new Date().toLocaleDateString('es-AR')} • Sistema de Protección Integral
                </Text>
            </Page>
        </Document>
    );
};

export default IntervencionesPDF;
