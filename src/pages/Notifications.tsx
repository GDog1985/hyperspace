import React, { Component } from 'react';
import {
    List, 
    ListItem, 
    ListItemText, 
    ListSubheader, 
    ListItemSecondaryAction, 
    ListItemAvatar, 
    Avatar, 
    Paper, 
    IconButton, 
    withStyles, 
    Typography,
    CircularProgress,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Tooltip
} from '@material-ui/core';
import PersonIcon from '@material-ui/icons/Person';
import PersonAddIcon from '@material-ui/icons/PersonAdd';
import DeleteIcon from '@material-ui/icons/Delete';
import {styles} from './PageLayout.styles';
import {LinkableIconButton} from '../interfaces/overrides';
import ForumIcon from '@material-ui/icons/Forum';
import Mastodon from 'megalodon';
import { Notification } from '../types/Notification';
import { Account } from '../types/Account';
import { withSnackbar } from 'notistack';

interface INotificationsPageState  {
    notifications?: [Notification];
    viewIsLoading: boolean;
    viewDidLoad?: boolean;
    viewDidError?: boolean;
    viewDidErrorCode?: string;
    deleteDialogOpen: boolean;
}

class NotificationsPage extends Component<any, INotificationsPageState> {

    client: Mastodon;

    constructor(props: any) {
        super(props);
        this.client = new Mastodon(localStorage.getItem('access_token') as string, localStorage.getItem('baseurl') + "/api/v1");

        this.state = {
            viewIsLoading: true,
            deleteDialogOpen: false
        }
    }

    componentWillMount() {
        this.client.get('/notifications').then((resp: any) => {
            let notifications: [Notification] = resp.data;
            this.setState({
                notifications,
                viewIsLoading: false,
                viewDidLoad: true
            })
        }).catch((err: Error) => {
            this.setState({
                viewDidLoad: true,
                viewIsLoading: false,
                viewDidError: true,
                viewDidErrorCode: err.message
            })
        })
    }

    toggleDeleteDialog() {
        this.setState({ deleteDialogOpen: !this.state.deleteDialogOpen });
    }

    removeHTMLContent(text: string) {
        const div = document.createElement('div');
        div.innerHTML = text;
        let innerContent = div.textContent || div.innerText || "";
        innerContent = innerContent.slice(0, 85) + "..."
        return innerContent;
    }

    removeNotification(id: string) {
        this.client.post('/notifications/dismiss', {id: id}).then((resp: any) => {
            let notifications = this.state.notifications;
            if (notifications !== undefined && notifications.length > 0) {
                notifications.forEach((notification: Notification) => {
                    if (notifications !== undefined && notification.id === id) {
                        notifications.splice(notifications.indexOf(notification), 1);
                    }
                })
            }
            this.setState({ notifications })
            this.props.enqueueSnackbar("Notification deleted.");
        }).catch((err: Error) => {
            this.props.enqueueSnackbar("Couldn't delete notification: " + err.name, {
                variant: 'error'
            });
        });
    }

    removeAllNotifications() {
        this.client.post('/notifications/clear').then((resp: any) => {
            this.setState({ notifications: undefined })
            this.props.enqueueSnackbar('All notifications deleted.');
        }).catch((err: Error) => {
            this.props.enqueueSnackbar("Couldn't delete notifications: " + err.name, {
                variant: 'error'
            });
        })
    }

    createNotification(notif: Notification) {
        let primary = "";
        let secondary = "";
        switch (notif.type) {
            case "follow":
                primary = `${notif.account.display_name || notif.account.username} is now following you!`;
                break;
            case "mention":
                primary = `${notif.account.display_name || notif.account.username} mentioned you in a post.`;
                secondary = this.removeHTMLContent(notif.status? notif.status.content: "");
                break;
            case "reblog":
                primary = `${notif.account.display_name || notif.account.username} reblogged your post.`;
                secondary = this.removeHTMLContent(notif.status? notif.status.content: "");
                break;
            case "favourite":
                primary = `${notif.account.display_name || notif.account.username} favorited your post.`;
                secondary = this.removeHTMLContent(notif.status? notif.status.content: "");
                break;
            default:
                if (notif.status && notif.status.poll) {
                    primary = "A poll you voted in or created has ended.";
                    secondary = this.removeHTMLContent(notif.status? notif.status.content: "");
                } else {
                    primary = "A magical thing happened!";
                }
                break;
        }
        return (
            <ListItem key={notif.id}>
                <ListItemAvatar>
                    <Avatar alt={notif.account.username} src={notif.account.avatar_static}>
                        <PersonIcon/>
                    </Avatar>
                </ListItemAvatar>
                <ListItemText primary={primary} secondary={secondary}/>
                <ListItemSecondaryAction>
                    {
                        notif.type === "follow"?
                        <Tooltip title="Follow account">
                            <IconButton onClick={() => this.followMember(notif.account)}>
                                <PersonAddIcon/>
                            </IconButton>
                        </Tooltip>:

                            notif.status?
                            <Tooltip title="View conversation">
                                <LinkableIconButton to={`/conversation/${notif.status.id}`}>
                                    <ForumIcon/>
                                </LinkableIconButton>
                            </Tooltip>:
                            null
                    }
                    <Tooltip title="Remove notification">
                        <IconButton onClick={() => this.removeNotification(notif.id)}>
                            <DeleteIcon/>
                        </IconButton>
                    </Tooltip>
                </ListItemSecondaryAction>
            </ListItem>
        );
    }

    followMember(acct: Account) {
        this.client.post(`/accounts/${acct.id}/follow`).then((resp: any) => {
            this.props.enqueueSnackbar('You are now following this account.');
        }).catch((err: Error) => {
            this.props.enqueueSnackbar("Couldn't follow account: " + err.name, { variant: 'error' });
            console.error(err.message);
        })
    }

    render() {
        const { classes } = this.props;
        return (
            <div className={classes.pageLayoutConstraints}>
                {
                    this.state.viewDidLoad? 
                        this.state.notifications && this.state.notifications.length > 0?
                        <div>
                            <ListSubheader>Recent notifications</ListSubheader>
                            <Button className={classes.clearAllButton} variant="text" onClick={() => this.toggleDeleteDialog()}> Clear All</Button>
                            <Paper className={classes.pageListConstraints}>
                                <List>
                                    {
                                        this.state.notifications.map((notification: Notification) => {
                                            return this.createNotification(notification)
                                        })
                                    }
                                </List>
                            </Paper>
                        </div>:
                        <div>
                            <Typography variant="h4">All clear!</Typography>
                            <Typography paragraph>It looks like you have no notifications. Why not get the conversation going with a new post?</Typography>
                        </div>:
                    null
                }
                {
                    this.state.viewDidError? 
                        <Paper className={classes.errorCard}>
                            <Typography variant="h4">Bummer.</Typography>
                            <Typography variant="h6">Something went wrong when loading this timeline.</Typography>
                            <Typography>{this.state.viewDidErrorCode? this.state.viewDidErrorCode: ""}</Typography>
                        </Paper>: 
                        <span/>
                }
                {
                    this.state.viewIsLoading?
                    <div style={{ textAlign: 'center' }}><CircularProgress className={classes.progress} color="primary" /></div>:
                    <span/>
                }

                <Dialog
                    open={this.state.deleteDialogOpen}
                    onClose={() => this.toggleDeleteDialog()}
                    >
                    <DialogTitle id="alert-dialog-title">Delete all notifications?</DialogTitle>
                    <DialogContent>
                        <DialogContentText id="alert-dialog-description">
                            Are you sure you want to delete all notifications? This action cannot be undone.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                    <Button onClick={() => this.toggleDeleteDialog()} color="primary" autoFocus>
                        Cancel
                        </Button>
                        <Button onClick={() => {
                            this.removeAllNotifications();
                            this.toggleDeleteDialog();
                        }} color="primary">
                        Delete
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        );
    }

}

export default withStyles(styles)(withSnackbar(NotificationsPage));