// This component is responsible for all the Messages and Header and the comment Section

import React, { Component, Fragment } from "react";
import { Segment, Comment, Message as Toast } from "semantic-ui-react";
import MessagesHeader from "./MessagesHeader";
import MessageForm from "./MessageForm";
import firebase from "../../firebase";
import Message from "./Message";
import { connect } from "react-redux";
import { setUserPosts } from "../../actions";
import Typing from "./Typing";
import Skeleton from "./Skeleton";

class Messages extends Component {
  state = {
    privateChannel: this.props.isPrivateChannel,
    //creating or referencing privateMessage Collection
    privateMessagesRef: firebase.database().ref("privateMessages"),
    //creating or referencing Message Collection
    messagesRef: firebase.database().ref("messages"),
    //this array contains local messages array
    messages: [],
    messagesLoading: true,
    //this is global current channel whenever we click a channel it sets the global value of channel
    channel: this.props.currentChannel,
    //this is global use currently logged in
    user: this.props.currentUser,
    progressBar: false,
    numUniqueUsers: "",
    //the value of search bar
    searchTerm: "",
    searchLoading: false,
    //this is similar to messages as it will be sent to Message Component
    //when search value is there and not the messages array
    searchResults: [],
    isChannelStarred: false,
    usersRef: firebase.database().ref("users"),
    typingRef: firebase.database().ref("typing"),
    typingUsers: [],
    connectedRef: firebase.database().ref(".info/connected"),
    listeners: [],
    noMessage: false,
  };

  componentDidMount() {
    //We have to Listen to the database for the values
    const { channel, user, listeners } = this.state;
    if (channel && user) {
      this.removeListeners(listeners);
      //providing the channel ID
      this.addListeners(channel.id);
      console.log(channel);
      this.addUserStarsListener(channel.id, user.uid);
    }
  }

  componentWillUnmount() {
    this.removeListeners(this.state.listeners);
    this.state.connectedRef.off();
  }

  removeListeners = (listeners) => {
    listeners.forEach((listener) => {
      listener.ref.child(listener.id).off(listener.event);
    });
  };

  componentDidUpdate(prevProps, prevState) {
    if (this.messagesEnd) {
      this.scrollToBottom();
    }
  }

  addToListeners = (id, ref, event) => {
    const index = this.state.listeners.findIndex((listener) => {
      return (
        listener.id === id && listener.ref === ref && listener.event === event
      );
    });
    if (index === -1) {
      const newListener = { id, ref, event };
      this.setState({ listeners: this.state.listeners.concat(newListener) });
    }
  };

  scrollToBottom = () => {
    this.messagesEnd.scrollIntoView({ behavior: "smooth" });
  };

  addListeners = (channelId) => {
    this.addMessageListener(channelId);
    this.addTypingListeners(channelId);
  };

  addTypingListeners = (channelId) => {
    let typingUsers = [];
    this.state.typingRef.child(channelId).on("child_added", (snap) => {
      if (snap.key !== this.state.user.uid) {
        typingUsers = typingUsers.concat({
          id: snap.key,
          name: snap.val(),
        });
        this.setState({ typingUsers });
      }
    });

    this.addToListeners(channelId, this.state.typingRef, "child_added");
    this.state.typingRef.child(channelId).on("child_removed", (snap) => {
      const index = typingUsers.findIndex((user) => user.id === snap.key);
      if (index !== -1) {
        typingUsers = typingUsers.filter((user) => user.id !== snap.key);
        this.setState({ typingUsers });
      }
    });
    this.addToListeners(channelId, this.state.typingRef, "child_removed");

    this.state.connectedRef.on("value", (snap) => {
      if (snap.val() === true) {
        this.state.typingRef
          .child(channelId)
          .child(this.state.user.uid)
          .onDisconnect()
          .remove((err) => {
            if (err !== null) {
              console.log(err);
            }
          });
      }
    });
  };

  addMessageListener = (channelId) => {
    let loadedMessages = [];
    const ref = this.getMessagesRef();
    ref.child(channelId).once("value", (snap) => {
      console.log(snap.val());
      if (!snap.val()) {
        this.setState({ messagesLoading: false, noMessage: true });
      }
    });
    ref.child(channelId).on("child_added", (snap) => {
      loadedMessages.push(snap.val());
      this.setState({
        messages: loadedMessages,
        messagesLoading: false,
        noMessage: false,
      });
      this.countUniqueUsers(loadedMessages);
      this.countUserPosts(loadedMessages);
    });
    this.addToListeners(channelId, ref, "child_added");
  };

  addUserStarsListener = (channelId, userId) => {
    this.state.usersRef
      .child(userId)
      .child("starred")
      .once("value")
      .then((data) => {
        if (data.val() !== null) {
          const channelIds = Object.keys(data.val());
          const prevStarred = channelIds.includes(channelId);
          this.setState({ isChannelStarred: prevStarred });
        }
      });
  };

  countUniqueUsers = (messages) => {
    const uniqueUsers = messages.reduce((acc, message) => {
      if (!acc.includes(message.user.name)) {
        acc.push(message.user.name);
      }
      return acc;
    }, []);
    const plural = uniqueUsers.length > 1 || uniqueUsers.length === 0;
    const numUniqueUsers = `${uniqueUsers.length} user${plural ? "s" : ""}`;
    this.setState({ numUniqueUsers });
  };

  handleStar = () => {
    this.setState(
      (prevState) => ({
        isChannelStarred: !prevState.isChannelStarred,
      }),
      () => this.starChannel()
    );
  };

  starChannel = () => {
    if (this.state.isChannelStarred) {
      this.state.usersRef.child(`${this.state.user.uid}/starred`).update({
        [this.state.channel.id]: {
          name: this.state.channel.name,
          details: this.state.channel.details,
          createdBy: {
            name: this.state.channel.createdBy.name,
            avatar: this.state.channel.createdBy.avatar,
          },
        },
      });
    } else {
      this.state.usersRef
        .child(`${this.state.user.uid}/starred`)
        .child(this.state.channel.id)
        .remove((err) => {
          if (err != null) {
            console.log(err);
          }
        });
    }
  };
  countUserPosts = (messages) => {
    let userPosts = messages.reduce((acc, message) => {
      if (message.user.name in acc) {
        acc[message.user.name].count += 1;
      } else {
        acc[message.user.name] = {
          avatar: message.user.avatar,
          count: 1,
        };
      }
      return acc;
    }, {});
    this.props.setUserPosts(userPosts);
  };

  displayMessages = (messages) =>
    messages.length > 0 &&
    messages.map((message) => (
      <Message
        key={message.timestamp}
        message={message}
        user={this.state.user}
      />
    ));

  isProgressBarVisible = (percent) => {
    if (percent > 0) {
      this.setState({ progressBar: true });
    }
  };

  getMessagesRef = () => {
    const { messagesRef, privateMessagesRef } = this.state;
    return this.state.privateChannel ? privateMessagesRef : messagesRef;
  };

  handleSearchChange = ({ target: { value } }) => {
    this.setState({ searchTerm: value, searchLoading: true }, () =>
      this.handleSearchMessages()
    );
  };
  handleSearchMessages = () => {
    const channelMessages = [...this.state.messages];
    const regex = new RegExp(this.state.searchTerm, "gi");
    const searchResults = channelMessages.reduce((acc, message) => {
      if (
        (message.content && message.content.match(regex)) ||
        message.user.name.match(regex)
      ) {
        acc.push(message);
      }
      return acc;
    }, []);
    this.setState({ searchResults });
    setTimeout(() => {
      this.setState({ searchLoading: false });
    }, 1000);
  };

  displayChannelName = (channel) => {
    return channel
      ? `${this.state.privateChannel ? "@" : "#"}${channel.name}`
      : "";
  };

  displayTypingUsers = (users) =>
    users.length > 0 &&
    users.map((user) => (
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "0.2em" }}
        key={user.id}
      >
        <span className='user__typing'>{user.name} is typing</span>
        <Typing />
      </div>
    ));

  displayMessagesSkeleton = (loading) =>
    loading ? (
      <Fragment>
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} />
        ))}
      </Fragment>
    ) : null;

  displayNoMessageToast = (noMessage) => {
    if (noMessage) {
      return (
        <Toast color='brown' size='large' compact className='toast_center'>
          No Messages here. Type messages to show here
        </Toast>
      );
    }
  };
  render() {
    const {
      messagesRef,
      channel,
      user,
      messages,
      progressBar,
      numUniqueUsers,
      searchTerm,
      searchResults,
      searchLoading,
      privateChannel,
      isChannelStarred,
      typingUsers,
      messagesLoading,
      noMessage,
    } = this.state;
    return (
      <Fragment>
        <MessagesHeader
          channelName={this.displayChannelName(channel)}
          numUniqueUsers={numUniqueUsers}
          handleSearchChange={this.handleSearchChange}
          searchLoading={searchLoading}
          isPrivateChannel={privateChannel}
          handleStar={this.handleStar}
          isChannelStarred={isChannelStarred}
        />
        <Segment>
          <Comment.Group
            className={progressBar ? "messages__progress" : "messages"}
          >
            {noMessage ? this.displayNoMessageToast(noMessage) : null}
            {this.displayMessagesSkeleton(messagesLoading)}
            {searchTerm
              ? this.displayMessages(searchResults)
              : this.displayMessages(messages)}
            {this.displayTypingUsers(typingUsers)}
            <div
              ref={(node) => {
                this.messagesEnd = node;
              }}
            ></div>
          </Comment.Group>
        </Segment>
        <MessageForm
          messagesRef={messagesRef}
          currentChannel={channel}
          currentUser={user}
          isProgressBarVisible={this.isProgressBarVisible}
          isPrivateChannel={privateChannel}
          getMessagesRef={this.getMessagesRef}
        />
      </Fragment>
    );
  }
}

export default connect(null, { setUserPosts })(Messages);
