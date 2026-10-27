// utils/chartGenerator.js
import QuickChart from 'quickchart-js';

const obtenerBufferDesdeQuickChart = async (chart) => {
    chart.setFormat('png');
    chart.setBackgroundColor('white');
    chart.setDevicePixelRatio(2);

    const url = chart.getUrl();
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error descargando gráfico: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
};

export const generarGraficoBarras = async ({ labels, data, label = 'Total', color = '#B90F0F' }) => {
    const chart = new QuickChart();
    chart.setWidth(800).setHeight(400);
    chart.setConfig({
        type: 'bar',
        data: {
            labels,
            datasets: [{ label, data, backgroundColor: color, borderRadius: 6, borderSkipped: false }]
        },
        options: {
            plugins: { legend: { display: true, position: 'top' } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#EEEEEE' } },
                x: { grid: { display: false } }
            }
        }
    });
    return await obtenerBufferDesdeQuickChart(chart);
};

export const generarGraficoLineas = async ({ labels, data, label = 'Tendencia', color = '#B90F0F' }) => {
    const chart = new QuickChart();
    chart.setWidth(800).setHeight(400);
    chart.setConfig({
        type: 'line',
        data: {
            labels,
            datasets: [{
                label, data,
                borderColor: color,
                backgroundColor: color + '33',
                fill: true, tension: 0.4,
                pointRadius: 4, pointBackgroundColor: color
            }]
        },
        options: {
            plugins: { legend: { display: true } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#EEEEEE' } },
                x: { grid: { display: false } }
            }
        }
    });
    return await obtenerBufferDesdeQuickChart(chart);
};

export const generarGraficoDona = async ({ labels, data, colores }) => {
    const palette = colores || [
        '#B90F0F', '#E63946', '#F77F00', '#FCBF49',
        '#06A77D', '#1D3557', '#457B9D', '#A8DADC'
    ];
    const chart = new QuickChart();
    chart.setWidth(800).setHeight(400);
    chart.setConfig({
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: palette.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#FFFFFF'
            }]
        },
        options: { plugins: { legend: { position: 'right' } } }
    });
    return await obtenerBufferDesdeQuickChart(chart);
};

export const generarGraficoBarrasHorizontales = async ({ labels, data, label = 'Total', color = '#1D3557' }) => {
    const chart = new QuickChart();
    chart.setWidth(800).setHeight(400);
    chart.setConfig({
        type: 'bar',
        data: {
            labels,
            datasets: [{ label, data, backgroundColor: color, borderRadius: 6 }]
        },
        options: {
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, grid: { color: '#EEEEEE' } },
                y: { grid: { display: false } }
            }
        }
    });
    return await obtenerBufferDesdeQuickChart(chart);
};