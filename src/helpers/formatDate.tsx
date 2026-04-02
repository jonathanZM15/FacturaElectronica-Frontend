const ECUADOR_TIME_ZONE = 'America/Guayaquil';
const ECUADOR_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC-05:00

type FormatDateTimeOptions = {
	timeZone?: string;
	withSeconds?: boolean;
};

const isValidDate = (d: Date) => !Number.isNaN(d.getTime());

const parseDateTimeAssumingEcuador = (value: unknown): Date | null => {
	if (value === undefined || value === null) return null;
	if (value instanceof Date) return isValidDate(value) ? value : null;

	const raw = String(value).trim();
	if (!raw) return null;

	// ISO with timezone indicator (Z or ±HH:MM): rely on native parsing.
	if (/([zZ]|[+-]\d{2}:\d{2})$/.test(raw)) {
		const d = new Date(raw);
		return isValidDate(d) ? d : null;
	}

	// ISO-ish without timezone (YYYY-MM-DDTHH:mm:ss(.frac)?)
	// or SQL-ish (YYYY-MM-DD HH:mm:ss(.frac)?)
	const m = raw.match(
		/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?$/
	);
	if (m) {
		const y = Number(m[1]);
		const mo = Number(m[2]);
		const d = Number(m[3]);
		const hh = Number(m[4]);
		const mm = Number(m[5]);
		const ss = Number(m[6] ?? 0);
		const frac = m[7] ?? '';
		const ms = frac ? Number((frac + '000').slice(0, 3)) : 0;

		// Interpretar el string como hora local de Ecuador (UTC-5) sin depender del timezone del navegador.
		const utcMs = Date.UTC(y, mo - 1, d, hh, mm, ss, ms) + ECUADOR_OFFSET_MS;
		const dt = new Date(utcMs);
		return isValidDate(dt) ? dt : null;
	}

	// Date-only (YYYY-MM-DD): interpret as local date in Ecuador at 00:00
	const dOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (dOnly) {
		const y = Number(dOnly[1]);
		const mo = Number(dOnly[2]);
		const d = Number(dOnly[3]);
		const utcMs = Date.UTC(y, mo - 1, d, 0, 0, 0, 0) + ECUADOR_OFFSET_MS;
		const dt = new Date(utcMs);
		return isValidDate(dt) ? dt : null;
	}

	const fallback = new Date(raw);
	return isValidDate(fallback) ? fallback : null;
};

export const formatDateTime = (
	value: unknown,
	{ timeZone = ECUADOR_TIME_ZONE, withSeconds = false }: FormatDateTimeOptions = {}
): string => {
	const dt = parseDateTimeAssumingEcuador(value);
	if (!dt) return '-';

	const date = dt.toLocaleDateString('es-EC', {
		timeZone,
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	});

	const time = dt.toLocaleTimeString('es-EC', {
		timeZone,
		hour: '2-digit',
		minute: '2-digit',
		second: withSeconds ? '2-digit' : undefined,
		hour12: false
	});

	return `${date} ${time}`;
};

