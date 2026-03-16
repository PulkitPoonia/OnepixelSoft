import * as Icons from 'tabler-icons-react';
import HkBadge from '../../components/@hk-badge/@hk-badge';

export const NavMenu = [
    {
        group: '',
        contents: [
            {
                name: 'Dashboard',
                icon: <Icons.Template />,
                path: '/dashboard',
                badge: <HkBadge size="sm" bg="pink" soft className="ms-xl-2 ms-auto" ></HkBadge>
            },
        ]
    },
    {
        group: 'Apps',
        contents: [
            
            {
                id: "dash_chat",
                name: 'Chat',
                icon: <Icons.MessageDots />,
                path: '/apps/chat/chats',
                childrens: [
                    {
                        name: 'Chats',
                        path: '/apps/chat/chats',
                        grp_name: "apps",
                    },
                    {
                        name: 'Groups',
                        path: '/apps/chat/chat-groups',
                        grp_name: "apps",
                    },
                    {
                        name: 'Contacts',
                        path: '/apps/chat/chat-contact',
                        grp_name: "apps",
                    },
                ]
            },
            {
                id: "dash_file",
                name: 'File Manager',
                icon: <Icons.FileCheck />,
                path: '/apps/file-manager',
                childrens: [
                    {
                        name: 'List View',
                        path: '/apps/file-manager/list-view',
                        grp_name: "apps",
                    },
                    {
                        name: 'Grid View',
                        path: '/apps/file-manager/grid-view',
                        grp_name: "apps",
                    },
                ]
            },
            // ...existing code...
            {
                name: 'Tasklist',
                icon: <Icons.ListDetails />,
                path: '/apps/todo/task-list',
                grp_name: "apps",
            },
            
            
            
        ]
    },

    {
        group: 'Pages',
        contents: [
            // Authentication menu removed
            {
                id: "dash_users",
                name: 'Users',
                icon: <Icons.Users />,
                path: '/admin/users',
                grp_name: "pages",
            },
            

        ]
    },

    


]