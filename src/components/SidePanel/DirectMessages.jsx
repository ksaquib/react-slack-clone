import React, { Component } from "react";
import { Menu, Icon } from "semantic-ui-react";
import firebase from "../../firebase";
import { connect } from "react-redux";
import { setCurrentChannel, setPrivateChannel } from "../../actions";

class DirectMessages extends Component {
  state = {
    activeChannel: "",
    user: this.props.currentUser,
    users: [],
    //users ref to detect any child added
    usersRef: firebase.database().ref("users"),
    //to get connected users
    connectedRef: firebase.database().ref(".info/connected"),
    //to get the object of currently logged in user
    presenceRef: firebase.database().ref("presence"),
  };

  componentDidMount() {
    if (this.state.user) {
      this.addListeners(this.state.user.uid);
    }
  }

  componentWillUnmount() {
    this.removeListeners();
  }

  removeListeners = () => {
    this.state.usersRef.off();
    this.state.presenceRef.off();
    this.state.connectedRef.off();
  };

  //This method is used to check whether a user is online or not
  addListeners = (currentUserUid) => {
    let loadedUsers = [];
    //to check if other user is also there
    this.state.usersRef.on("child_added", (snap) => {
      if (currentUserUid !== snap.key) {
        let user = snap.val();
        user["uid"] = snap.key;
        user["status"] = "offline";
        loadedUsers.push(user);
        this.setState({ users: loadedUsers });
      }
    });

    //get the value of connected users and create a presence object in firebase to
    //put the true or false in front of user
    this.state.connectedRef.on("value", (snap) => {
      if (snap.val() === true) {
        const ref = this.state.presenceRef.child(currentUserUid);
        ref.set(true);
        ref.onDisconnect().remove((err) => {
          if (err != null) {
            console.log(err);
          }
        });
      }
    });
    //if there is a new child added in presence ref
    this.state.presenceRef.on("child_added", (snap) => {
      if (currentUserUid !== snap.key) {
        this.addStateToUser(snap.key);
      }
    });
    this.state.presenceRef.on("child_removed", (snap) => {
      if (currentUserUid !== snap.key) {
        this.addStateToUser(snap.key, false);
      }
    });
  };
  //Here we are passing the userId of presenceRef Object and setting the value of connected
  addStateToUser = (userId, connected = true) => {
    const updatedUsers = this.state.users.reduce((acc, user) => {
      if (user.uid === userId) {
        user["status"] = `${connected ? "online" : "offline"}`;
      }
      return acc.concat(user);
    }, []);
    this.setState({ users: updatedUsers });
  };

  //checking the presence of user
  isUserOnline = (user) => user.status === "online";

  //when user clicks on a user who is either offline or online
  //we will create a channel through which they can talk
  changeChannel = (user) => {
    const channelId = this.getChannelId(user.uid);
    const channelData = {
      id: channelId,
      name: user.name,
    };
    this.props.setCurrentChannel(channelData);
    this.props.setPrivateChannel(true);
    this.setActiveChannel(user.uid);
  };

  //when we click a user on direct message then the data of that user is populated in userId
  getChannelId = (userId) => {
    //userID of the clicked
    //currentUserId is the using one
    const currentUserId = this.state.user.uid;
    console.log(currentUserId);
    return userId < currentUserId
      ? `${userId}/${currentUserId}`
      : `${currentUserId}/${userId}`;
  };

  setActiveChannel = (userId) => {
    this.setState({ activeChannel: userId });
  };
  render() {
    const { users, activeChannel } = this.state;
    return (
      <Menu.Menu className='menu'>
        <Menu.Item>
          <span>
            <Icon name='mail' />
            DIRECT MESSAGES
          </span>{" "}
          ({users.length})
        </Menu.Item>
        {/* User to send Direct Messages */}
        {users.map((user) => (
          <Menu.Item
            key={user.uid}
            active={user.uid === activeChannel}
            onClick={() => this.changeChannel(user)}
            style={{ opacity: 0.7, fontStyle: "italic" }}
          >
            <Icon
              name='circle'
              color={this.isUserOnline(user) ? "green" : "red"}
            />
            @{user.name}
          </Menu.Item>
        ))}
      </Menu.Menu>
    );
  }
}

export default connect(null, { setCurrentChannel, setPrivateChannel })(
  DirectMessages
);
