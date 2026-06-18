import {
  formatDateSeparatorLabel,
  formatDateTime,
  formatMessageStamp,
  formatTime,
  getDateGroupKey,
  getRecordTimestamp,
  type TimestampedRecord,
} from "@/lib/dateTime";

export type TimestampedMessage =
  TimestampedRecord;

export const getMessageTimestamp =
  getRecordTimestamp;

export {
  formatDateSeparatorLabel,
  formatMessageStamp,
  formatTime as formatMessageTime,
  getDateGroupKey,
};

export const formatDateGroupLabel =
  formatDateSeparatorLabel;

export const formatFullMessageStamp =
  formatDateTime;
