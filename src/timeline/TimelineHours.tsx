import range from 'lodash/range';
import times from 'lodash/times';

import React, {useCallback, useMemo, useRef} from 'react';
import {View, Text, TouchableWithoutFeedback, ViewStyle, TextStyle, StyleSheet, Pressable} from 'react-native';

import constants from '../commons/constants';
import {buildTimeString, calcTimeByPosition, calcDateByPosition} from './helpers/presenter';
import {backgroundHours, HOUR_BLOCK_HEIGHT, UnavailableHours} from './Packer';

interface NewEventTime {
  hour: number;
  minutes: number;
  date?: string;
}

export interface TimelineHoursProps {
  start?: number;
  end?: number;
  date?: string;
  format24h?: boolean;
  onBackgroundLongPress?: (timeString: string, time: NewEventTime) => void;
  onBackgroundLongPressOut?: (timeString: string, time: NewEventTime) => void;
  unavailableHours?: UnavailableHours[];
  backgroundFillHours?: backgroundHours[];
  unavailableHoursColor?: string;
  styles: {[key: string]: ViewStyle | TextStyle};
  width: number;
  numberOfDays: number;
  timelineLeftInset?: number;
  testID?: string;
  halfHourLines?: boolean;
  unavailableHoursClick?: Function;
}

const dimensionWidth = constants.screenWidth;
const EVENT_DIFF = 20;

const TimelineHours = (props: TimelineHoursProps) => {
  const {
    format24h,
    start = 0,
    end = 24,
    date,
    unavailableHours,
    backgroundFillHours,
    unavailableHoursColor,
    styles,
    onBackgroundLongPress,
    onBackgroundLongPressOut,
    width,
    numberOfDays = 1,
    timelineLeftInset = 0,
    testID,
    halfHourLines = true,
    unavailableHoursClick = () => {}
  } = props;

  const dynamicBackgroundHoursBlocks = (data: any) =>
    useMemo(() => {
      if (data && Array.isArray(data)) {
        const currentDateBlocks = data?.filter(block =>
          block?.start?.startsWith(date || ''),
        );
        return currentDateBlocks.map(block => {
          const startTime = new Date(block?.start);
          const endTime = new Date(block?.end);
          const startHour =
            startTime?.getHours() + startTime?.getMinutes() / 60;
          const endHour = endTime?.getHours() + endTime?.getMinutes() / 60;
          return {
            top:
              ((startHour - start) / (end - start)) *
              (HOUR_BLOCK_HEIGHT * (end - start)),
            height: (endHour - startHour) * HOUR_BLOCK_HEIGHT,
            backgroundColor: block?.color,
            ...(block?.lineColor && { lineColor: block?.lineColor }),
            ...(block?.type && { type: block?.type }),
          };
        });
      }
    }, [date, start, end]);
  

  const lastLongPressEventTime = useRef<NewEventTime>();
  // const offset = this.calendarHeight / (end - start);
  const offset = HOUR_BLOCK_HEIGHT;

  const backgroundHoursBlocks = dynamicBackgroundHoursBlocks(backgroundFillHours);
  const unavailableHoursBlocks = dynamicBackgroundHoursBlocks(unavailableHours);


  const hours = useMemo(() => {
    return range(start, end + 1).map(i => {
      let timeText;

      if (i === start) {
        timeText = '00:00';
      } else if (i < 12) {
        timeText = !format24h ? `${i} AM` : `${i}:00`;
      } else if (i === 12) {
        timeText = !format24h ? `${i} PM` : `${i}:00`;
      } else if (i === 24) {
        timeText = !format24h ? '12 AM' : '23:59';
      } else {
        timeText = !format24h ? `${i - 12} PM` : `${i}:00`;
      }
      return {timeText, time: i};
    });
  }, [start, end, format24h]);

  const handleBackgroundPress = useCallback(
    event => {
      const yPosition = event.nativeEvent.locationY;
      const xPosition = event.nativeEvent.locationX;
      const {hour, minutes} = calcTimeByPosition(yPosition, HOUR_BLOCK_HEIGHT);
      const dateByPosition = calcDateByPosition(xPosition, timelineLeftInset, numberOfDays, date);
      lastLongPressEventTime.current = {hour, minutes, date: dateByPosition};

      const timeString = buildTimeString(hour, minutes, dateByPosition);
      onBackgroundLongPress?.(timeString, lastLongPressEventTime.current);
    },
    [onBackgroundLongPress, date]
  );

  const handlePressOut = useCallback(() => {
    if (lastLongPressEventTime.current) {
      const {hour, minutes, date} = lastLongPressEventTime.current;
      const timeString = buildTimeString(hour, minutes, date);
      onBackgroundLongPressOut?.(timeString, lastLongPressEventTime.current);
      lastLongPressEventTime.current = undefined;
    }
  }, [onBackgroundLongPressOut, date]);

  const handleUnavailableHoursClick = useCallback(
    (event, block) => {
      const yPosition = event.nativeEvent.locationY;
      const xPosition = event.nativeEvent.locationX;
      const {hour, minutes} = calcTimeByPosition(yPosition, HOUR_BLOCK_HEIGHT);
      const dateByPosition = calcDateByPosition(xPosition, timelineLeftInset, numberOfDays, date);
      lastLongPressEventTime.current = {hour, minutes, date: dateByPosition};

      const timeString = buildTimeString(hour, minutes, dateByPosition);
      unavailableHoursClick?.(timeString, lastLongPressEventTime.current, block?.type || 'sd');
    },
    [unavailableHoursClick, date]
  );

  return (
    <>
      <TouchableWithoutFeedback onLongPress={handleBackgroundPress} onPressOut={handlePressOut}>
        <View style={StyleSheet.absoluteFillObject} >
          {backgroundHoursBlocks.map((block, index) => (
            <View
              key={index}
              style={[
                styles.backgroundFillHoursBlock,
                block,
                {left: timelineLeftInset}
              ]}
            ></View>
          ))}
        </View>
      </TouchableWithoutFeedback>
      {unavailableHoursBlocks.map((block, index) => (
        <Pressable
          onPress={(event) => handleUnavailableHoursClick(event, block)}
          key={index}
          style={[
            styles.unavailableHoursBlock,
            block,
            {left: timelineLeftInset}
          ]}
        >
          <View style={[styles.patternContainer,{backgroundColor: block.backgroundColor}]}>
            {Array.from({ length: 200 }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.horizontalLine,
                  {
                    top: index * 10,
                    backgroundColor: block?.lineColor,
                  },
                ]}
              />
            ))}
          </View>
        </Pressable>
      ))}

      {hours.map(({timeText, time}, index) => {
        return (
          <React.Fragment key={time}>
            <Text key={`timeLabel${time}`} style={[styles.timeLabel, {top: offset * index - 6, width: timelineLeftInset - 16}]}>
              {timeText}
            </Text>
              <View
                key={`line${time}`}
                testID={`${testID}.${time}.line`}
                style={[styles.line, {top: offset * index, width: dimensionWidth - EVENT_DIFF, left: timelineLeftInset - 16}]}
              />
            {halfHourLines ?
              <View
                key={`lineHalf${time}`}
                testID={`${testID}.${time}.lineHalf`}
                style={[styles.line, {top: offset * (index + 0.5), width: dimensionWidth - EVENT_DIFF, left: timelineLeftInset - 16}]}
              />
              : null}
          </React.Fragment>
        );
      })}
      {times(numberOfDays, (index) => <View key={index} style={[styles.verticalLine, {right: (index + 1) * width / numberOfDays}]} />)}
    </>
  );
};

export default React.memo(TimelineHours);
