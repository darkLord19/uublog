---
id: 6
title: "What exactly is a Container?"
slug: "what-exactly-is-a-container"
category: "technology"
author: "umang"
created_date: "2019-05-29T17:47:55.164192+00:00"
published_date: "2019-05-29T19:02:59.049956+00:00"
keywords: null
---

If you aren't living under a rock, you must have heard term containers or docker at least. Have you ever wondered what exactly a container is? I sure as hell did. So I did a quick google search and the first result was from docker.com. I am quoting an exact sentence from the website below.

>A container is a standard unit of software that packages up the code and all its dependencies so the application runs quickly and reliably from one computing environment to another.

But this didn't make much sense to me. (If it did to you, please do let me know how and what.)

I kinda made peace with it though as I couldn't find anything different. Before yesterday, If you had asked me what is a container. I would have answered something similar to the above quote and some tech jargon like lightweight VM and blah blah blah. 

The other day when I was wandering around in GitHub I stumbled across a video named ["Build your own container from scratch in Go"][0]. It piqued my curiosity so I played the video and holly forking shirtballs!!! Now I understand what actually a container is! And now that I understand what it is I can truly appreciate its beauty and simplicity.

So, I will try to explain what I understood in the simplest form I possibly can. Here goes nothing!

#### Container definition simplified
A container provides an isolated magic-box where you can install your software and run it independently from everything else on the system.

Now let's get back to the definition given above of container in docker.com and read it in your head and then read the above paragraph. Repeat once more. Are you starting to make sense of it now? Yes? Great. No? Read again. Still can't make sense? No worries, drop me a mail!

Now we have an abstract idea of what a container is, let's jump right into technical details about how is it implemented.

So before going into implementation details, there are few words we need to understand.

#### Linux namespaces:
We know that Linux processes form a tree-like hierarchy with the init process being the root of the tree with pid 1. Namespaces in Linux provides a mechanism to create many hierarchies of processes with their own “subtrees” with that child process as a root of this new subtree with auxiliary pid 1 such that processes in one subtree can't access or know of those in another. There are different kinds of namespaces available in Linux such as pid, networking, mount, etc.

There is a shell command and a syscall named unshare which is used to create a namespace in Linux. You can read more about in man pages or the internet!

#### Linux cgroups
cgroups is an abbreviated form of control groups. It is visible from the name itself that it has something to do with controlling something. So let's say we create a new namespace but what if we use up all of the actual resources(disk storage or RAM) from inside the namespace then how would the main namespace(with init as root node) operate? And if the main namespace can't operate then can our system(OS) remain running? Here comes the cgroups in the play.

We can control how much resources(RAM, Disk storage, etc) a namespace or set of namespaces can use. Pretty cool right?


Alright, I think at this point you have an idea of how containers are implemented, don't you?
Container software uses Linux namespaces and cgroups and creates an isolated subtree of processes only visible to that tree which we identify as a single container.

So that's it about containers but now that we are talking about containers I would like to add something about Docker images.
So, Docker has a concept of docker images. It is known that we can install a docker image on any machine and it will work the same regardless of the underlying OS and their programs and their versions. 

#### So what exactly a docker image is?
A docker image is kinda a virtual file system. In Linux, we have a command called chroot using which we can change the apparent root directory for the current running process and their children. A program that is running in such a modified environment cannot access files and commands outside that environmental directory tree. So what docker does is it creates a new namespace and sets the docker image(which contains file system with required software installed) as its root directory so it's like having a new virtual machine but in reality, it is running on the same Linux kernel creating an illusion of a virtual machine.

[0]: https://www.youtube.com/watch?v=Utf-A4rODH8

If you have questions or suggestions, do let me know. Thanks for reading.
