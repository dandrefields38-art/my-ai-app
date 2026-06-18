export type TimestampedRecord = {
  created_at?: string;
  updated_at?: string;
};

const DEFAULT_LOCALE =
  "en-US";

const MS_PER_DAY =
  86_400_000;

type DateFormatOptions = {
  timeZone?: string | null;
};

export const getBrowserTimeZone =
  () =>
    Intl.DateTimeFormat()
      .resolvedOptions()
      .timeZone;

const getFormatter = (
  options: Intl.DateTimeFormatOptions,
  timeZone?: string | null
) =>
  new Intl.DateTimeFormat(
    DEFAULT_LOCALE,
    {
      timeZone:
        timeZone ||
        getBrowserTimeZone(),
      ...options,
    }
  );

const getDate = (
  timestamp: string
) => {
  const normalized =
    /^\d{4}-\d{2}-\d{2}T/.test(
      timestamp
    ) &&
    !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(
      timestamp
    )
      ? `${timestamp}Z`
      : timestamp;
  const date =
    new Date(normalized);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
};

const getLocalDateParts = (
  date: Date,
  timeZone?: string | null
) => {
  const parts =
    getFormatter({
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }, timeZone).formatToParts(date);

  const getPart = (
    type: Intl.DateTimeFormatPartTypes
  ) =>
    Number(
      parts.find(
        (part) =>
          part.type === type
      )?.value
    );

  return {
    year:
      getPart("year"),
    month:
      getPart("month"),
    day:
      getPart("day"),
  };
};

const getLocalDayOrdinal = (
  date: Date,
  timeZone?: string | null
) => {
  const {
    year,
    month,
    day,
  } = getLocalDateParts(
    date,
    timeZone
  );

  return Math.floor(
    Date.UTC(
      year,
      month - 1,
      day
    ) / MS_PER_DAY
  );
};

const getLocalDayDiff = (
  timestamp: string,
  timeZone?: string | null
) => {
  const date =
    getDate(timestamp);

  if (!date) {
    return 0;
  }

  return (
    getLocalDayOrdinal(
      new Date(),
      timeZone
    ) -
    getLocalDayOrdinal(
      date,
      timeZone
    )
  );
};

export const getRecordTimestamp = (
  record: TimestampedRecord
) =>
  record.created_at ||
  record.updated_at ||
  new Date().toISOString();

export const getDateGroupKey = (
  timestamp: string,
  options: DateFormatOptions = {}
) => {
  const date =
    getDate(timestamp);

  if (!date) {
    return "unknown";
  }

  const {
    year,
    month,
    day,
  } = getLocalDateParts(
    date,
    options.timeZone
  );

  return [
    year,
    month,
    day,
  ].join("-");
};

export const formatShortDate = (
  timestamp: string,
  options: DateFormatOptions = {}
) => {
  const date =
    getDate(timestamp);

  return date
    ? getFormatter({
        month: "short",
        day: "numeric",
      }, options.timeZone).format(date)
    : "Unavailable";
};

export const formatDate = (
  timestamp: string,
  options: DateFormatOptions = {}
) => {
  const date =
    getDate(timestamp);

  return date
    ? getFormatter({
        month: "short",
        day: "numeric",
        year: "numeric",
      }, options.timeZone).format(date)
    : "Unavailable";
};

export const formatLongDate = (
  timestamp: string,
  options: DateFormatOptions = {}
) => {
  const date =
    getDate(timestamp);

  return date
    ? getFormatter({
        month: "long",
        day: "numeric",
        year: "numeric",
      }, options.timeZone).format(date)
    : "Unavailable";
};

export const formatTime = (
  timestamp: string,
  options: DateFormatOptions = {}
) => {
  const date =
    getDate(timestamp);

  return date
    ? getFormatter({
        hour: "numeric",
        minute: "2-digit",
      }, options.timeZone).format(date)
    : "Unavailable";
};

export const formatDateTime = (
  timestamp: string,
  options: DateFormatOptions = {}
) => {
  const date =
    getDate(timestamp);

  return date
    ? getFormatter({
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }, options.timeZone).format(date)
    : "Unavailable";
};

export const formatMessageStamp = (
  timestamp: string,
  options: DateFormatOptions = {}
) =>
  `${formatDate(timestamp, options)} • ${formatTime(
    timestamp,
    options
  )}`;

export const formatDateSeparatorLabel = (
  timestamp: string,
  options: DateFormatOptions = {}
) => {
  const diffDays =
    getLocalDayDiff(
      timestamp,
      options.timeZone
    );

  if (diffDays <= 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  return formatLongDate(
    timestamp,
    options
  );
};

export const formatRelativeDateGroup = (
  timestamp: string,
  options: DateFormatOptions = {}
) => {
  const diffDays =
    getLocalDayDiff(
      timestamp,
      options.timeZone
    );

  if (diffDays <= 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays <= 7) {
    return "Last 7 Days";
  }

  if (diffDays <= 30) {
    return "Last 30 Days";
  }

  return "Older";
};

export const formatActivityDate = (
  timestamp: string,
  options: DateFormatOptions = {}
) => {
  const diffDays =
    getLocalDayDiff(
      timestamp,
      options.timeZone
    );

  if (diffDays <= 0) {
    return formatTime(
      timestamp,
      options
    );
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  return formatShortDate(
    timestamp,
    options
  );
};

export const getTimestampDate = (
  timestamp?: string | null
) =>
  getDate(
    timestamp || "0"
  ) || new Date(0);
