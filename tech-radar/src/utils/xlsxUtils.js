import * as XLSX from 'xlsx';

export const exportRadarDataToXLSX = (style, allRadarItems, allEmployees) => {
    try {
        const { name, settings } = style;
        const wb = XLSX.utils.book_new();

        const metaData = [{ type: 'techRadarData', version: '1.0', name: name }];
        const ws_meta = XLSX.utils.json_to_sheet(metaData);
        XLSX.utils.book_append_sheet(wb, ws_meta, 'meta');

        const generalData = [
            { key: 'Название радара', value: settings.title },
            { key: 'Цвет фона', value: settings.colors.background },
            { key: 'Цвет текста', value: settings.colors.text }
        ];
        const ws_general = XLSX.utils.json_to_sheet(generalData, { skipHeader: true });
        XLSX.utils.book_append_sheet(wb, ws_general, 'Основные настройки');

        const ringsData = settings.rings.map((ringName, i) => ({ 'Название кольца': ringName, 'Цвет': settings.colors.rings[i] }));
        const ws_rings = XLSX.utils.json_to_sheet(ringsData);
        XLSX.utils.book_append_sheet(wb, ws_rings, 'Кольца');

        const quadrantsData = settings.quadrants.map((quadrantName, i) => ({ 'Название квадранта': quadrantName, 'Цвет': settings.colors.quadrants[i] }));
        const ws_quadrants = XLSX.utils.json_to_sheet(quadrantsData);
        XLSX.utils.book_append_sheet(wb, ws_quadrants, 'Квадранты');
        
        const departmentsData = settings.departments.map((depName, i) => ({ 'Название отдела': depName, 'Цвет': settings.colors.departments[i] }));
        const ws_departments = XLSX.utils.json_to_sheet(departmentsData);
        XLSX.utils.book_append_sheet(wb, ws_departments, 'Отделы');

        const itemsData = allRadarItems.map(item => ({
            'Название': item.name,
            'Отдел': item.department,
            'Квадрант': settings.quadrants[item.quadrant],
            'Кольцо': settings.rings[item.ring],
            'Владельцы': item.owners.join(', ')
        }));
        const ws_items = XLSX.utils.json_to_sheet(itemsData);
        XLSX.utils.book_append_sheet(wb, ws_items, 'Элементы');

        const employeesData = allEmployees.map(emp => ({ 'Имя сотрудника': emp }));
        const ws_employees = XLSX.utils.json_to_sheet(employeesData);
        XLSX.utils.book_append_sheet(wb, ws_employees, 'Сотрудники');

        XLSX.writeFile(wb, `Радар_${name.replace(/ /g, '_')}.xlsx`);

    } catch (error) {
        console.error("Ошибка при экспорте данных радара:", error);
        alert("Не удалось экспортировать данные. См. консоль для подробностей.");
    }
};

export const importStyleFromXLSX = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target.result;
                const wb = XLSX.read(data, { type: 'array' });

                if (!wb.SheetNames.includes('meta')) return reject('Неверный формат файла: отсутствует лист "meta".');
                const meta = XLSX.utils.sheet_to_json(wb.Sheets['meta'])[0];
                if (meta.type !== 'techRadarData' && meta.type !== 'techRadarStyle') return reject('Файл не является файлом стиля для Тех. Радара.');

                const newSettings = { colors: {} };
                const sheetName = wb.SheetNames.includes('Основные настройки') ? 'Основные настройки' : 'Основные';

                const generalData = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
                const generalMap = new Map(generalData);
                newSettings.title = generalMap.get('Название радара');
                newSettings.colors.background = generalMap.get('Цвет фона');
                newSettings.colors.text = generalMap.get('Цвет текста');

                const ringsData = XLSX.utils.sheet_to_json(wb.Sheets['Кольца']);
                newSettings.rings = ringsData.map(r => r['Название кольца']);
                newSettings.colors.rings = ringsData.map(r => r['Цвет']);

                const quadrantsData = XLSX.utils.sheet_to_json(wb.Sheets['Квадранты']);
                newSettings.quadrants = quadrantsData.map(r => r['Название квадранта']);
                newSettings.colors.quadrants = quadrantsData.map(r => r['Цвет']);

                const departmentsData = XLSX.utils.sheet_to_json(wb.Sheets['Отделы']);
                newSettings.departments = departmentsData.map(r => r['Название отдела']);
                newSettings.colors.departments = departmentsData.map(r => r['Цвет']);
                
                if (!newSettings.title || !newSettings.rings || !newSettings.quadrants || !newSettings.departments) {
                    return reject('Файл поврежден или имеет неверную структуру.');
                }
                
                resolve({ name: meta.name || 'Импортированный радар', settings: newSettings });

            } catch (err) {
                console.error("Ошибка парсинга файла стиля:", err);
                reject('Ошибка при обработке файла. Убедитесь, что структура верна.');
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};