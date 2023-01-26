function commitDriveGitHub(token,user,branch,author,email,folderId){
  var props = {
    base_url: "https://api.github.com/repos/"+user+"/"+branch+"/git/",
    token: token,
    authorName: author,
    email: email,
    folderId: folderId,
    extensions: [".md",".txt",".py",".cpp",".vue",".html"]
  }
  getGithubParent(props)
  const fileContents = getDriveFiles(props.folderId,props.extensions)
  createGithubCommit(props,fileContents)
}


function getGithubParent(props){
  var response = UrlFetchApp.fetch(props.base_url+"refs/heads/master", {
    headers: {
      Authorization: 'token ' + props.token
    }
  });
  props.base_ref = JSON.parse(response).object.sha
  response = UrlFetchApp.fetch(props.base_url+"commits/"+props.base_ref, {
    headers: {
      Authorization: 'token ' + props.token
    }
  });
  props.base_tree = JSON.parse(response).tree.sha
  return props
}

function createGithubCommit(props,files){
  let blobs = createGithubBlobs(props,files)
  let tree = createGithubTree(props,blobs)
  let response = UrlFetchApp.fetch(props.base_url+"commits", {
    'method' : 'POST',
    headers: {
      Authorization: 'token ' + props.token,
    },
    'payload' : JSON.stringify({
      "message": "Google Driveからのcommit",
      "author": {
        "name": props.authorName,
        "email": props.email,
        "date": Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ssXXX")
      },
      "parents": [
        props.base_ref
      ],
      "tree": tree
    })
  });
  let commitSha = JSON.parse(response).sha
  UrlFetchApp.fetch(props.base_url+"refs/heads/master", {
    'method' : 'PATCH',
    headers: {
      Authorization: 'token ' + props.token,
    },
    'payload' : JSON.stringify({
      "sha": commitSha,
      "force": false
    })
  });
}

function createGithubBlobs(props,files){
  let blobs = []
  files.forEach(function(file){
    let content = file.content
    let response = UrlFetchApp.fetch(props.base_url+"blobs", {
      'method' : 'POST',
      headers: {
        Authorization: 'token ' + props.token,
      },
      'payload' : JSON.stringify({
        "content": content,
        "encoding": "utf-8"
      })
    });
    blobs.push({fileName: file.name, sha: JSON.parse(response).sha})
  })
  return blobs
}

function createGithubTree(props,blobs){
  let post_data = {
    "base_tree": props.base_tree,
    "tree": []
  }
  blobs.forEach(function(blob){
    post_data.tree.push(
      {
        "path": blob.fileName,
        "mode": "100644",
        "type": "blob",
        "sha" : blob.sha
      }
    )
  })
  let response = UrlFetchApp.fetch(props.base_url+"trees", {
    'method' : 'POST',
    headers: {
      Authorization: 'token ' + props.token,
    },
    'payload' : JSON.stringify(post_data)
  });
  return JSON.parse(response).sha
}

function getFileExtension(filename){
  const dotLastIndex = filename.lastIndexOf(".");
  return filename.slice(dotLastIndex);
}

function getDriveFiles(folderId,extensions){
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  const fileContents = []
  while(files.hasNext()){
    
    let file = files.next();

    let fileName =file.getName();
    let fileContent = ""
    if (extensions.includes(getFileExtension(fileName))){
      fileContent = file.getBlob().getDataAsString("utf-8");
      fileContents.push({name: fileName,content: fileContent})
    }   
  }
  return fileContents
}


function myFunction() {
  props = PropertiesService.getScriptProperties().getProperties()
  const TOKEN = props.TOKEN
  const USER = props.USER
  const BRANCH = props.BRANCH
  const AuthorName = props.AuthorName
  const Email = props.Email
  const FolderID = props.FolderID

  commitDriveGitHub(TOKEN,USER,BRANCH,AuthorName,Email,FolderID)
}

