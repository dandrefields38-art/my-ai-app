export type TimestampedMessage = {
  created_at?: string;
  updated_at?: string;
};

const dateFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );

const separatorDateFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );

const timeFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  );

const fullFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );

const startOfDay = (
  date: Date
) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

export const getMessageTimestamp = (
  message: TimestampedMessage
) =>
  message.created_at ||
  message.updated_at ||
  new Date().toISOString();

export const getDateGroupKey = (
  timestamp: string
) => {
  const date =
    new Date(timestamp);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "unknown";
  }

  return [
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ].join("-");
};

export const formatDateGroupLabel = (
  timestamp: string
) => {
  const date =
    new Date(timestamp);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Today";
  }

  const today =
    startOfDay(new Date());
  const messageDay =
    startOfDay(date);
  const diffDays =
    Math.round(
      (today.getTime() -
        messageDay.getTime()) /
        86_400_000
    );

  if (diffDays === 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  return dateFormatter.format(
    date
  );
};

export const formatDateSeparatorLabel = (
  timestamp: string
) => {
  const date =
    new Date(timestamp);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Today";
  }

  const today =
    startOfDay(new Date());
  const messageDay =
    startOfDay(date);
  const diffDays =
    Math.round(
      (today.getTime() -
        messageDay.getTime()) /
        86_400_000
    );

  if (diffDays === 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  return separatorDateFormatter.format(
    date
  );
};

export const formatMessageTime = (
  timestamp: string
) =>
  timeFormatter.format(
    new Date(timestamp)
  );

export const formatMessageStamp = (
  timestamp: string
) =>
  `${dateFormatter.format(
    new Date(timestamp)
  )} • ${formatMessageTime(timestamp)}`;

export const formatFullMessageStamp = (
  timestamp: string
) =>
  fullFormatter.format(
    new Date(timestamp)
  );
