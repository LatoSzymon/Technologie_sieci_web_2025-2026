<template>
  <div class="tag-manager">
    <h2>Tag Management</h2>
    <form @submit.prevent="addTag">
      <input v-model="newTagName" placeholder="New tag name" required />
      <button type="submit">Add Tag</button>
    </form>
    <ul>
      <li v-for="tag in tags" :key="tag._id">
        <input v-model="tag.name" @blur="updateTag(tag)" />
        <button @click="deleteTag(tag._id)">Delete</button>
      </li>
    </ul>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script>
import tagService from '../services/tagService';

export default {
  name: 'TagManager',
  data() {
    return {
      tags: [],
      newTagName: '',
      error: ''
    };
  },
  async created() {
    await this.fetchTags();
  },
  methods: {
    async fetchTags() {
      try {
        this.tags = await tagService.getTags();
      } catch (e) {
        this.error = 'Failed to load tags.';
      }
    },
    async addTag() {
      try {
        const tag = await tagService.createTag({ name: this.newTagName });
        this.tags.push(tag);
        this.newTagName = '';
      } catch (e) {
        this.error = 'Failed to add tag.';
      }
    },
    async updateTag(tag) {
      try {
        await tagService.updateTag(tag._id, { name: tag.name });
      } catch (e) {
        this.error = 'Failed to update tag.';
      }
    },
    async deleteTag(tagId) {
      try {
        await tagService.deleteTag(tagId);
        this.tags = this.tags.filter(t => t._id !== tagId);
      } catch (e) {
        this.error = 'Failed to delete tag.';
      }
    }
  }
};
</script>

<style scoped>
.tag-manager {
  max-width: 520px;
  margin: 0 auto;
  padding: 20px;
  background: var(--panel);
  border: 2px solid var(--border);
}
.tag-manager h2 {
  margin-top: 0;
  color: var(--accent);
}
.tag-manager form {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.tag-manager input {
  flex: 1;
  min-width: 200px;
  padding: 8px 10px;
  border: 2px solid var(--border);
  background: #0d0d0d;
  color: var(--text);
}
.tag-manager button {
  padding: 8px 12px;
  border: 2px solid var(--border);
  background: var(--accent);
}
.tag-manager ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tag-manager li {
  display: flex;
  gap: 8px;
  align-items: center;
}
.error {
  color: var(--danger);
  margin-top: 10px;
}
</style>
