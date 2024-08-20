import React, {useEffect, useState} from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Linking,
  Alert,
} from "react-native";
import axios from "axios";
import backendUrls from "../connections/backendUrls";
import {useAuth} from "../context/AuthContext";
import useLoadingWithinComponent from "../customHooks/useLoadingWithinComponent";
import LoadingModal from "../components/LoadingModal";
import ActiveBookingCard from "../components/ActiveBookingCard";
const {activeBookingsURL, cancelBookingURL} = backendUrls;
import database from "@react-native-firebase/database";

const NavigateToParkArea = async (latitude, longitude) => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving&dir_action=navigate`;
  if (await Linking.canOpenURL(url)) {
    Linking.openURL(url);
  } else {
    Alert.alert("Navigation Error", "Failed to open navigation app.");
  }
};

export default function ActiveBookings() {
  const {user} = useAuth();
  const {isLoading, startLoading, stopLoading} = useLoadingWithinComponent();
  const [activeBookings, setActiveBookings] = useState([]);
  const [rdbData, setRdbData] = useState([]);

  const fetchActiveBookings = async () => {
    try {
      const response = await axios.post(activeBookingsURL, {userId: user._id});
      setActiveBookings(response.data.activeBookings);
      console.log("Active bookings:", response.data);
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to fetch active bookings. Please try again later."
      );
    } finally {
    }
  };

  const handleCancelBooking = async bookingId => {
    try {
      startLoading();
      const response = await axios.post(cancelBookingURL, {bookingId});
      if (response.data.success) {
        Alert.alert("Success", response.data.message);
        await fetchActiveBookings();
      } else {
        Alert.alert("Error", response.data.message);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to cancel booking. Please try again later.");
    } finally {
      await fetchActiveBookings();
    }
  };

  const confirmCancelBooking = booking => {
    if (booking.checkInTime !== null) {
      Alert.alert(
        "Error",
        "You cannot cancel a booking that has already been checked in."
      );
      return;
    }
    Alert.alert("Cannot cancel booking", "Cancellation is non-refundable.");
    return;

    Alert.alert(
      "Cancel Booking",
      "Do you want to cancel your booking? Cancellation is non-refundable.",
      [
        {
          text: "No",
          onPress: () => console.log("Cancellation aborted"),
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: () => handleCancelBooking(booking._id),
          style: "destructive",
        },
      ],
      {cancelable: false}
    );
  };

  const renderBookingItem = ({item}) => {
    console.log("Item:", item);
    let parkId = item.parkAreaId._id;
    let bookingId = item._id;
    console.log("RDB Data:", rdbData);
    return (
      <ActiveBookingCard
        item={item}
        rdbData={rdbData ? rdbData[parkId][bookingId] : null}
        onNavigateToParkArea={NavigateToParkArea}
        onCancelBooking={confirmCancelBooking}
      />
    );
  };

  useEffect(() => {
    database()
      .ref("/parkareas/activeBookings")
      .on("value", snapshot => {
        console.log("Active bookings:", snapshot.val());
        setRdbData(snapshot.val());
        fetchActiveBookings();
      });

    return () => {
      database().ref("/parkareas/activeBookings").off("value");
    };
  }, []);

  return (
    <View style={styles.container}>
      {isLoading && <LoadingModal visible={isLoading} />}
      <FlatList
        data={activeBookings}
        renderItem={renderBookingItem}
        keyExtractor={item => item._id}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchActiveBookings}
          />
        }
        ListEmptyComponent={
          <View
            style={{flex: 1, justifyContent: "center", alignItems: "center"}}
          >
            <Text style={{fontSize: 17, color: "#666"}}>
              You have no active bookings
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    flex: 1,
    backgroundColor: "white",
  },
});
